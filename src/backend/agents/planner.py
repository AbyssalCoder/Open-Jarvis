"""
Action Planner — decomposes intents into executable step plans.

Simple intents (weather, open_app) → single tool call.
Complex intents (research, create_project) → multi-step chains.

Each plan is a list of steps executed sequentially.
Steps can reference results of previous steps.
"""

import json
import httpx
from typing import Any

from config import config
from agents.tools import execute_tool, TOOLS


class ActionStep:
    """Single step in an execution plan."""
    __slots__ = ("tool", "args", "description", "depends_on", "result", "status")

    def __init__(self, tool: str, args: dict, description: str = "", depends_on: int | None = None):
        self.tool = tool
        self.args = args
        self.description = description
        self.depends_on = depends_on  # index of step whose result to inject
        self.result: str | None = None
        self.status: str = "pending"  # pending | running | done | failed


class ActionPlan:
    """An executable plan composed of ordered steps."""
    __slots__ = ("steps", "intent", "user_input")

    def __init__(self, intent: str, user_input: str, steps: list[ActionStep]):
        self.intent = intent
        self.user_input = user_input
        self.steps = steps

    async def execute(self) -> list[dict[str, Any]]:
        """Execute all steps sequentially, returning results."""
        results = []
        for i, step in enumerate(self.steps):
            step.status = "running"

            # Inject previous step result if needed
            if step.depends_on is not None and 0 <= step.depends_on < len(results):
                prev_result = results[step.depends_on].get("result", "")
                step.args["context"] = prev_result

            try:
                result = await execute_tool(step.tool, step.args)
                step.result = result
                step.status = "done"
                results.append({"step": i, "tool": step.tool, "result": result, "ok": True})
            except Exception as e:
                step.status = "failed"
                step.result = str(e)
                results.append({"step": i, "tool": step.tool, "result": str(e), "ok": False})
                # Don't abort the whole plan on a single failure — continue best-effort

        return results


def plan_from_intent(tool: str, args: dict, user_input: str) -> ActionPlan:
    """Build an execution plan from a classified intent.
    Simple intents → 1 step.
    Complex intents → multi-step chains.
    """
    # Most intents are single-step
    if tool == "none":
        return ActionPlan(intent="conversation", user_input=user_input, steps=[])

    # ── Multi-step patterns ───────────────────────────────────────────

    if tool == "research_topic":
        # Research = web search → summarize results
        return ActionPlan(
            intent="research",
            user_input=user_input,
            steps=[
                ActionStep(tool="web_search", args={"query": args.get("query", user_input)},
                           description="Searching the web"),
                ActionStep(tool="web_search", args={"query": f"{args.get('query', user_input)} latest findings"},
                           description="Searching for recent findings"),
            ],
        )

    if tool == "create_project":
        # Create project = create folder → write code → git init
        name = args.get("name", "new-project")
        template = args.get("template", "python")
        return ActionPlan(
            intent="create_project",
            user_input=user_input,
            steps=[
                ActionStep(tool="create_project", args={"name": name, "template": template},
                           description=f"Creating {template} project '{name}'"),
            ],
        )

    if tool == "browser_action" and args.get("action") == "add_to_cart":
        # Shopping = search → add to cart (single tool handles the flow)
        return ActionPlan(
            intent="shopping",
            user_input=user_input,
            steps=[
                ActionStep(tool="browser_action", args=args,
                           description=f"Shopping for {args.get('query', 'item')} on {args.get('site', 'amazon')}"),
            ],
        )

    if tool == "study_help" and args.get("action") == "study_plan":
        # Study plan = get materials + create plan
        return ActionPlan(
            intent="study",
            user_input=user_input,
            steps=[
                ActionStep(tool="study_help", args=args,
                           description=f"Creating study plan for {args.get('subject', 'topic')}"),
            ],
        )

    if tool == "draft_email":
        # Draft email is single step but could chain with check_gmail
        return ActionPlan(
            intent="email",
            user_input=user_input,
            steps=[
                ActionStep(tool="draft_email", args=args,
                           description=f"Drafting email to {args.get('to', 'recipient')}"),
            ],
        )

    # ── Default: single-step plan ─────────────────────────────────────
    return ActionPlan(
        intent=tool,
        user_input=user_input,
        steps=[
            ActionStep(tool=tool, args=args, description=f"Executing {tool}"),
        ],
    )


async def plan_with_llm(user_input: str, tool: str, args: dict) -> ActionPlan | None:
    """Ask the LLM to decompose a complex request into multiple tool calls.
    Only used for requests that seem to need multiple steps.
    Returns None if decomposition isn't needed.
    """
    # Only try LLM planning for clearly complex requests
    complex_signals = ["and then", "after that", "also", "first", "then", "next",
                       "followed by", "and also", "plus"]
    if not any(s in user_input.lower() for s in complex_signals):
        return None

    try:
        tool_list = ", ".join(sorted(TOOLS.keys()))
        messages = [
            {"role": "system", "content": f"""You are a task planner. Break down the user's request into sequential tool calls.
Available tools: {tool_list}

Respond with a JSON array of steps:
[{{"tool": "tool_name", "args": {{"key": "value"}}, "description": "what this step does"}}]

Rules:
- Each step must use a real tool from the list
- Keep it minimal — don't add unnecessary steps
- If the request is simple (1 tool), return a single-element array
- Max 5 steps"""},
            {"role": "user", "content": user_input},
        ]

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                f"{config.ollama_url}/api/chat",
                json={
                    "model": config.default_model,
                    "messages": messages,
                    "stream": False,
                    "options": {"num_gpu": -1, "num_ctx": 1024, "temperature": 0.1},
                    "format": "json",
                },
            )
            resp.raise_for_status()
            data = resp.json()

        content = data.get("message", {}).get("content", "").strip()
        steps_data = json.loads(content)

        # Handle both array and object responses
        if isinstance(steps_data, dict):
            steps_data = steps_data.get("steps", [steps_data])

        if not isinstance(steps_data, list) or len(steps_data) < 2:
            return None  # Not worth multi-step planning

        steps = []
        for i, s in enumerate(steps_data[:5]):  # cap at 5 steps
            t = s.get("tool", "")
            if t not in TOOLS:
                continue
            steps.append(ActionStep(
                tool=t,
                args=s.get("args", {}),
                description=s.get("description", f"Step {i+1}"),
                depends_on=i - 1 if i > 0 else None,
            ))

        if len(steps) >= 2:
            return ActionPlan(intent="multi_step", user_input=user_input, steps=steps)

    except Exception:
        pass

    return None
