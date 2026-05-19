"""
Intent Classifier — fast rule-based + LLM fallback intent classification.
Architecture ref: docs/architecture/MODEL_ROUTING_SYSTEM.md §3
"""

from dataclasses import dataclass


@dataclass
class Intent:
    type: str           # chat, code, file, terminal, web, system, automation, knowledge, memory
    confidence: float   # 0.0 — 1.0
    method: str         # "keyword" | "llm" | "heuristic"


@dataclass
class ComplexityEstimate:
    level: str          # simple, moderate, complex, expert
    score: int


# Rule-based keyword → intent mapping (< 1ms)
KEYWORD_INTENTS: dict[str, list[str]] = {
    "chat": [
        "hello", "hi", "hey", "how are you", "what's up", "thanks", "thank you",
        "good morning", "good night", "tell me a joke", "who are you",
    ],
    "code": [
        "write code", "function", "class", "debug", "fix bug", "implement",
        "code", "script", "program", "refactor", "syntax", "compile", "algorithm",
        "python", "javascript", "typescript", "rust", "html", "css", "react",
        "api", "endpoint", "database", "sql", "regex", "test",
    ],
    "file": [
        "create file", "open file", "read file", "delete file", "find file",
        "save file", "rename", "move file", "copy file", "list files",
        "directory", "folder", "path",
    ],
    "terminal": [
        "run command", "execute", "terminal", "shell", "npm", "pip", "git",
        "docker", "brew", "cargo", "make", "build", "install",
    ],
    "web": [
        "search", "browse", "open website", "google", "look up",
        "fetch", "download", "url", "http", "web page",
    ],
    "system": [
        "system info", "cpu", "memory", "disk", "process", "monitor",
        "battery", "temperature", "network", "performance", "gpu",
    ],
    "automation": [
        "automate", "schedule", "workflow", "cron", "recurring",
        "every day", "every hour", "batch", "pipeline",
    ],
    "knowledge": [
        "explain", "what is", "how does", "teach me", "describe",
        "summarize", "analyze", "compare", "difference between",
        "why", "define", "meaning of",
    ],
    "memory": [
        "remember", "recall", "forget", "what did i say",
        "history", "previous", "last time", "you said",
    ],
    "vision": [
        "screenshot", "screen", "look at", "what do you see",
        "image", "picture", "photo", "camera", "ocr", "read screen",
    ],
}

# Multi-step / reasoning indicators
MULTI_STEP_WORDS = [
    "and then", "after that", "also", "additionally", "step by step",
    "first", "second", "third", "finally", "next",
]
REASONING_WORDS = [
    "analyze", "compare", "evaluate", "design", "architect", "optimize",
    "plan", "strategy", "tradeoff", "pros and cons", "best approach",
    "recommend", "suggest", "review",
]


class IntentClassifier:
    """Fast intent classification with keyword rules and complexity scoring."""

    def classify(self, message: str) -> Intent:
        """Classify user intent using keyword matching."""
        msg = message.lower().strip()

        # Score each intent by keyword matches
        scores: dict[str, float] = {}
        for intent, keywords in KEYWORD_INTENTS.items():
            matches = sum(1 for kw in keywords if kw in msg)
            if matches > 0:
                scores[intent] = matches

        if scores:
            best = max(scores, key=scores.get)  # type: ignore
            # Confidence scales with number of keyword hits
            conf = min(0.5 + scores[best] * 0.1, 0.95)
            return Intent(type=best, confidence=conf, method="keyword")

        # Default to general chat
        return Intent(type="chat", confidence=0.3, method="heuristic")

    def estimate_complexity(self, message: str, intent: str) -> ComplexityEstimate:
        """Estimate task complexity to determine model tier."""
        score = 0
        msg = message.lower()

        # Message length
        if len(message) > 500:
            score += 2
        elif len(message) > 200:
            score += 1

        # Multi-step indicators
        score += sum(1 for w in MULTI_STEP_WORDS if w in msg)

        # Reasoning indicators
        score += sum(2 for w in REASONING_WORDS if w in msg)

        # Code-specific complexity
        if intent == "code":
            code_complexity = [
                "architecture", "system design", "microservice", "distributed",
                "concurrent", "async", "optimization", "security",
            ]
            score += sum(2 for w in code_complexity if w in msg)

        if score <= 1:
            level = "simple"
        elif score <= 3:
            level = "moderate"
        elif score <= 5:
            level = "complex"
        else:
            level = "expert"

        return ComplexityEstimate(level=level, score=score)


# Global singleton
intent_classifier = IntentClassifier()
