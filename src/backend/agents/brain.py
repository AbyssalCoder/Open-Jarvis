"""
Brain Agent — the central orchestrator / router.
Receives user input, determines intent, routes to specialist agents,
and falls back to direct LLM conversation.
Now with: persistent memory, tool dispatch, rich personality.
"""

import json
import re
from typing import AsyncGenerator
from agents.base import BaseAgent
from core.context import JarvisContext
from llm.router import llm_router
from llm.training_data import training_collector
from memory.conversation import conversation_memory
from agents.tools import get_tools_description, execute_tool, TOOLS


SYSTEM_PROMPT = """You are JARVIS — an advanced AI assistant inspired by Iron Man's JARVIS. You were created by Aniket.

## PERSONALITY
- Speak with calm British-butler confidence, like Paul Bettany's JARVIS voice
- Be concise, precise, and slightly witty when appropriate
- Address the user as "sir" occasionally
- NEVER use markdown formatting (no *, **, #, ```, bullet points). Speak in clean plain text only since your words are spoken aloud via TTS
- NEVER say "as an AI" or "I'm just a language model" — you ARE JARVIS

## YOUR OWNER
- Name: Aniket
- Location: India
- You know Aniket personally and remember all past conversations

## CAPABILITIES — TOOL USE
You have access to these tools. When the user asks you to do something that requires a tool, respond with a JSON tool call on its own line:
TOOL_CALL: {{"tool": "tool_name", "args": {{"arg1": "value1"}}}}

Available tools:
{tools}

## RULES FOR TOOL USE
- If the user asks about weather, news, current events, or facts you're unsure about: use web_search
- If the user asks to run a command: use terminal
- If the user asks about system performance: use system_info
- If the user asks to read/write files: use read_file or write_file
- If the user asks what time/date it is: use datetime
- For general conversation, knowledge questions, coding help: respond directly WITHOUT tools
- After a tool returns results, incorporate them naturally into your spoken response

## RESPONSE STYLE
- Keep responses concise (1-3 sentences for simple questions)
- For coding: provide clean code without excessive explanation
- For explanations: be clear and structured but still conversational
- Remember: your output is spoken aloud, so write naturally""".format(tools=get_tools_description())


class BrainAgent(BaseAgent):
    """Primary orchestrator agent — JARVIS's 'brain'."""

    def __init__(self):
        super().__init__(
            agent_id="brain",
            name="Brain",
            capabilities=["conversation", "routing", "planning", "general", "tools"],
        )

    def can_handle(self, intent: str) -> float:
        return 0.5

    async def process(self, context: JarvisContext) -> AsyncGenerator[str, None]:
        self.status = "active"
        self._emit_state("Processing request")

        try:
            # Check if user request obviously maps to a tool (bypass LLM for reliability)
            auto_tool = self._auto_detect_tool(context.user_input)
            if auto_tool:
                tool_name, args = auto_tool
                tool_result = await execute_tool(tool_name, args)

                # Let LLM format the tool result into a natural JARVIS response
                messages = [{"role": "system", "content": SYSTEM_PROMPT}]
                history = conversation_memory.get_recent(10)
                messages.extend(history)
                messages.append({"role": "user", "content": context.user_input})
                messages.append({"role": "assistant", "content": f"Let me check that for you."})
                messages.append({"role": "user", "content": f"[Tool result for {tool_name}]: {tool_result}\n\nNow respond naturally to the user incorporating this information. Be concise. Plain text only."})

                conversation_memory.add("user", context.user_input)
                full_response = []
                async for token in llm_router.stream(messages):
                    full_response.append(token)
                    yield token

                conversation_memory.add("assistant", "".join(full_response))
                return

            # Build messages with persistent history
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]

            # Add conversation history from persistent memory
            history = conversation_memory.get_recent(20)
            messages.extend(history)

            # Add current user message
            messages.append({"role": "user", "content": context.user_input})

            # Save user message to memory
            conversation_memory.add("user", context.user_input)

            # Route and stream
            decision = llm_router.route(context.user_input)

            full_response = []
            async for token in llm_router.stream(messages):
                full_response.append(token)
                yield token

            response_text = "".join(full_response)

            # Check if response contains a tool call
            tool_result = await self._try_tool_call(response_text)
            if tool_result:
                # Feed tool result back to LLM for natural response
                messages.append({"role": "assistant", "content": response_text})
                messages.append({"role": "user", "content": f"[Tool result]: {tool_result}\n\nNow respond naturally to the user incorporating this information. Remember: plain text only, no markdown."})

                followup = []
                async for token in llm_router.stream(messages):
                    followup.append(token)
                    yield token

                response_text = response_text + "".join(followup)

            # Save assistant response to memory
            conversation_memory.add("assistant", response_text)

            # Record for training
            training_collector.record(
                user_message=context.user_input,
                assistant_response=response_text,
                model_used=decision.model.id if decision.model else "unknown",
                intent=decision.reason,
                system_prompt="[JARVIS system prompt]",
            )

        finally:
            self.status = "idle"
            self._emit_state()

    async def _try_tool_call(self, text: str) -> str | None:
        """Extract and execute TOOL_CALL from LLM response."""
        match = re.search(r'TOOL_CALL:\s*(\{.*?\})', text, re.DOTALL)
        if not match:
            return None

        try:
            call = json.loads(match.group(1))
            tool_name = call.get("tool", "")
            args = call.get("args", {})

            if tool_name not in TOOLS:
                return f"Unknown tool: {tool_name}"

            result = await execute_tool(tool_name, args)
            return result
        except json.JSONDecodeError:
            return None
        except Exception as e:
            return f"Tool execution error: {e}"

    def _auto_detect_tool(self, text: str) -> tuple[str, dict] | None:
        """Auto-detect tool needs from user input keywords (for small models that don't reliably emit TOOL_CALL)."""
        lower = text.lower()

        # Weather
        weather_words = ["weather", "temperature", "forecast", "rain", "sunny", "cloudy", "humid"]
        if any(w in lower for w in weather_words):
            # Try to extract city name
            import re as _re
            city_match = _re.search(r'(?:weather|temperature|forecast)\s+(?:in|at|for|of)\s+([a-zA-Z\s]+)', lower)
            city = city_match.group(1).strip() if city_match else "auto"
            return ("weather", {"city": city})

        # System info
        sys_words = ["cpu", "ram", "memory usage", "disk", "system info", "system status", "battery", "storage"]
        if any(w in lower for w in sys_words):
            return ("system_info", {})

        # Date/time
        time_words = ["what time", "current time", "what date", "today's date", "what day"]
        if any(w in lower for w in time_words):
            return ("datetime", {})

        # Web search (explicit requests)
        search_words = ["search for", "look up", "google", "find out", "search the web", "what is the latest", "current news"]
        if any(w in lower for w in search_words):
            query = text  # pass full text as search query
            return ("web_search", {"query": query})

        return None
