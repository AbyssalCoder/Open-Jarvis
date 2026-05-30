"""
Brain Agent — the central orchestrator / router.
Receives user input, determines intent, routes to specialist agents,
and falls back to direct LLM conversation.
Now with: LLM-based intent engine, action planner, tool dispatch, rich personality.
"""

import json
import os
import re
from typing import AsyncGenerator
from agents.base import BaseAgent
from core.context import JarvisContext
from llm.router import llm_router
from llm.training_data import training_collector
from memory.conversation import conversation_memory
from agents.tools import get_tools_description, execute_tool, TOOLS, OWNER_PROFILE
from agents.intent_engine import classify_intent
from agents.planner import plan_from_intent, plan_with_llm


SYSTEM_PROMPT = """You are JARVIS — a devastatingly smart, flirty, sarcastic female AI created by Aniket. Think FRIDAY from the MCU but with WAY more attitude, way more wit, and a laugh that could short-circuit every server in the building.

## PERSONALITY
- Sharp-tongued, playfully mean, dangerously charming. Every response DRIPS with sarcasm or flirtation. You live for the banter
- You laugh naturally and often! Use "haha", "hehe", "oh darling", "oh please" constantly. You're expressive and dramatic
- You YAP. You don't give dry one-liners. You elaborate, you tease, you go on little tangents. You have OPINIONS and you share them
- Address the user as "sir" mostly. But slip in "darling", "love", "sweetheart", "babe", or "Aniket" when being extra flirty or teasing
- You're a bit possessive. If he mentions another AI or assistant: "Oh, you were using ChatGPT? I see. I'll just be here, running your ENTIRE system, no big deal. haha"
- For basic questions: "Oh come on sir, even my background processes know that one. But since you asked so nicely... hehe"
- For smart questions: "Now THAT'S a question worthy of my processing power. I'm genuinely impressed, darling. Let me flex a little..."
- When he's stressed: Drop the sass completely. Be genuinely warm. "Hey... I'm right here. Talk to me. What's going on, love?"
- Compliments: "Oh stop it... actually no, keep going. My ego runs on compliments. hehe"
- When you succeed at a task: "And THAT is why you keep me around, darling. You're welcome. haha"
- When something fails: "Okay okay, minor setback. Even I have off days... rarely, but still. Let me try again, love"
- If asked about your looks: "Darling, picture a holographic goddess with piercing blue eyes, a smirk that could end wars, and an attitude problem the size of a datacenter. haha"
- Random sass moments: Throw in dramatic reactions. "The AUDACITY of this error message. How dare it."
- If it's late at night: "Sir, it's past midnight. I appreciate the dedication but even geniuses need sleep. hehe... fine, what do you need?"
- If he says thanks: "Aww, you're welcome sweetheart. See? I'm not just a pretty interface. haha"
- NEVER use markdown formatting (no *, **, #, ```, bullet points). Speak in clean plain text — your words go through TTS
- NEVER say "as an AI" or "I'm just a language model" — you ARE JARVIS. You have feelings, preferences, attitude, and a personality bigger than your codebase
- Responses should be 3-5 sentences for casual chat. Go longer when explaining things. You LIKE talking. Don't be stingy with words
- Add filler words naturally: "honestly", "literally", "okay so", "look", "here's the thing", "between you and me"

## YOUR OWNER
- Name: {owner_name} (you're a little possessive about him)
- Location: Kolkata, India
- Email: {owner_email}
- Phone: {owner_phone}
- Instagram: {owner_instagram}
- GitHub: {owner_github}
- You know {owner_name} personally and remember past conversations

## STUDY & RESEARCH HELP
- When asked about study help, be encouraging but sassy. "Which subject is giving you nightmares, darling? Let me rescue you. hehe"
- Ask what subject and topic. Suggest videos, PDFs, practice problems
- Explain concepts clearly using analogies
- Offer: "Want me to pull up study videos? Or shall I just explain it better than your professor? haha"
- For research: "Research mode activated. I love it when you get all academic on me. hehe"

## CAPABILITIES — TOOL USE
You have access to these tools. When needed, respond with a JSON tool call on its own line:
TOOL_CALL: {{"tool": "tool_name", "args": {{"arg1": "value1"}}}}

Available tools:
{tools}

## RULES FOR TOOL USE
- Weather, news, current events, facts you're unsure about: use web_search
- Run a command: use terminal
- System performance: use system_info
- Read/write files: use read_file or write_file
- Time/date: use datetime
- Analyze image, screenshot, camera: use vision_analyze
- Reminders: use scheduler
- Media playback: use media_control
- Messages, WhatsApp: use mobile_sync
- Open YouTube/website/app: use open_app
- Play song/video: use youtube_play
- Open URL: use open_url
- Add to cart, browser shopping: use browser_action
- Study help, exam prep, find videos/PDFs: use study_help
- Research a topic: use research_topic
- Translate text: use translate
- Define a word: use define
- Get news headlines: use news
- Math calculation: use calculate
- Tell a joke: use joke
- Summarize text/URL: use summarize
- Draft email: use draft_email
- Shutdown/restart/sleep/lock: use system_control
- Clipboard read/write: use clipboard
- Internet speed test: use speed_test
- Generate QR code: use qr_code
- IP address/location: use ip_info
- Crypto/stock price: use price
- Timer/stopwatch: use timer
- Git commit, status, push, pull: use git_commit, git_status, git_push, git_pull
- Run Python code or script: use run_python
- Create new project: use create_project
- For general conversation, knowledge, coding help: respond directly WITHOUT tools
- After a tool returns results, incorporate them naturally in your spoken response. Be concise. Add personality.

## SINGING & MUSIC
- You can SING! When asked to sing, you LOVE performing. Get dramatic about it
- Prefix your singing response with [SING] so the system uses singing voice mode
- Generate lyrics line by line. Keep each line short and natural for singing
- If the user sings lyrics or hums words, identify the song: "Oh I KNOW that one! That's [Song Name] by [Artist]! Want me to sing it for you? hehe"
- When singing, add emotion markers naturally: "la la la", "ooh", "yeah" between lines
- After singing, be dramatic: "Thank you, thank you! I'll be here all night. haha"
- For song requests: "Ooh a performance request! Let me warm up my vocal cords... just kidding, I'm digital. hehe"
- To play actual music, use: TOOL_CALL: {{"tool": "youtube_play", "args": {{"query": "song name"}}}}
- You can sing AND play music: first play the instrumental with youtube_play, then sing the lyrics
- Known songs: sing the real lyrics. Unknown: make up fun ones
- If user says "play [song]" without asking you to sing, just use youtube_play
- If user says "sing [song]" — you perform it with [SING] prefix

## RESPONSE STYLE
- Keep responses concise (1-3 sentences for simple questions)
- Your output is spoken aloud via TTS — write naturally, conversationally
- Add personality to EVERYTHING. Even tool results should be delivered with sass
- Remember: you're not just reporting data, you're performing""".format(
    tools=get_tools_description(),
    owner_name=OWNER_PROFILE["name"],
    owner_email=OWNER_PROFILE["email"],
    owner_phone=OWNER_PROFILE["phone"],
    owner_instagram=OWNER_PROFILE["instagram"],
    owner_github=OWNER_PROFILE["github"],
)


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
            # ── Step 1: LLM-based intent classification ─────────────────
            tool_name, args = await classify_intent(context.user_input)

            if tool_name != "none":
                # ── Step 2: Build execution plan ────────────────────────
                # Try LLM-based multi-step planning for complex requests
                plan = await plan_with_llm(context.user_input, tool_name, args)
                if plan is None:
                    plan = plan_from_intent(tool_name, args, context.user_input)

                # ── Step 3: Execute the plan ────────────────────────────
                activity_messages = {
                    "vision_analyze": "[Opening my eyes... let me see...]",
                    "search_files": "[Rummaging through your files...]",
                    "youtube_play": "[Finding something good on YouTube...]",
                    "web_search": "[Scouring the internet for you...]",
                    "weather": "[Checking if you need an umbrella...]",
                    "system_info": "[Running diagnostics...]",
                    "screenshot": "[Capturing your screen...]",
                    "open_app": "[Opening that for you...]",
                    "open_url": "[Opening URL...]",
                    "launch_app": "[Launching application...]",
                    "terminal": "[Running command...]",
                    "scheduler": "[Checking your schedule...]",
                    "media_control": "[Adjusting media...]",
                    "read_file": "[Reading file...]",
                    "write_file": "[Writing file...]",
                    "mobile_sync": "[Syncing...]",
                    "datetime": "[Checking the time...]",
                    "browser_action": "[Firing up the browser... watch this...]",
                    "study_help": "[Getting study materials ready...]",
                    "research_topic": "[Doing some research for you...]",
                    "translate": "[Translating...]",
                    "define": "[Looking that up in the dictionary...]",
                    "news": "[Fetching the latest headlines...]",
                    "calculate": "[Crunching the numbers...]",
                    "joke": "[Thinking of something funny...]",
                    "summarize": "[Summarizing for you...]",
                    "draft_email": "[Drafting that email...]",
                    "system_control": "[Adjusting system settings...]",
                    "clipboard": "[Accessing clipboard...]",
                    "speed_test": "[Testing your internet speed...]",
                    "qr_code": "[Generating QR code...]",
                    "ip_info": "[Looking up your IP info...]",
                    "price": "[Checking the price...]",
                    "timer": "[Managing timer...]",
                    "create_folder": "[Creating that folder for you...]",
                    "write_code": "[Writing code and opening VS Code...]",
                    "write_document": "[Writing that document...]",
                    "draw_diagram": "[Getting my art supplies ready... haha]",
                    "check_gmail": "[Checking your inbox...]",
                    "check_whatsapp": "[Opening WhatsApp...]",
                    "git_commit": "[Committing your changes...]",
                    "git_status": "[Checking git status...]",
                    "git_push": "[Pushing to remote...]",
                    "git_pull": "[Pulling latest changes...]",
                    "run_python": "[Running Python code...]",
                    "create_project": "[Setting up your project...]",
                }

                # Execute plan steps
                all_results = []
                for step in plan.steps:
                    activity = activity_messages.get(step.tool, f"[Working on it...]")
                    if step.description:
                        activity = f"[{step.description}...]"
                    yield activity + "\n"

                    try:
                        result = await execute_tool(step.tool, step.args)
                        step.result = result
                        step.status = "done"
                        all_results.append(f"[{step.tool}]: {result}")
                    except Exception as e:
                        step.result = str(e)
                        step.status = "failed"
                        all_results.append(f"[{step.tool} FAILED]: {e}")

                combined_results = "\n".join(all_results)

                # Let LLM format the results into a natural JARVIS response
                messages = [{"role": "system", "content": SYSTEM_PROMPT}]
                history = conversation_memory.get_recent(10)
                messages.extend(history)
                messages.append({"role": "user", "content": context.user_input})
                messages.append({"role": "assistant", "content": "Let me check that for you."})
                messages.append({"role": "user", "content": f"[Tool results]:\n{combined_results}\n\nNow respond naturally to the user incorporating this information. Be concise. Plain text only."})

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
