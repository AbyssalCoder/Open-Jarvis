# JARVIS — Memory Architecture

## Persistent Intelligence & Knowledge Management

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Backend → Memory System

---

## Table of Contents

1. [Memory Philosophy](#1-memory-philosophy)
2. [Memory Types & Hierarchy](#2-memory-types--hierarchy)
3. [Working Memory](#3-working-memory)
4. [Episodic Memory](#4-episodic-memory)
5. [Semantic Memory](#5-semantic-memory)
6. [Procedural Memory](#6-procedural-memory)
7. [Vector Storage (ChromaDB)](#7-vector-storage-chromadb)
8. [SQLite Schema & Operations](#8-sqlite-schema--operations)
9. [Embedding Pipeline](#9-embedding-pipeline)
10. [Memory Consolidation Engine](#10-memory-consolidation-engine)
11. [Context Window Assembly](#11-context-window-assembly)
12. [Memory API & Agent Integration](#12-memory-api--agent-integration)
13. [Checkpointing & Durability](#13-checkpointing--durability)
14. [Performance & Scaling](#14-performance--scaling)

---

## 1. Memory Philosophy

### 1.1 What Makes JARVIS Remember

JARVIS's memory system is modeled after human cognitive memory:

| Human Memory | JARVIS Equivalent | Implementation |
|---|---|---|
| Short-term / Working | Working Memory | In-memory context window |
| Episodic (events/experiences) | Episodic Memory | SQLite + embeddings |
| Semantic (facts/knowledge) | Semantic Memory | ChromaDB vectors |
| Procedural (skills/how-to) | Procedural Memory | SQLite structured JSON |
| Consolidation (sleep) | Consolidation Engine | Background worker |

### 1.2 Principles

1. **JARVIS never forgets conversations** — Every interaction is stored, indexed, searchable
2. **Recall is semantic, not keyword** — "What did I say about React?" finds relevant context even if "React" isn't an exact match
3. **Memory is ranked by importance** — Trivial chatter decays, critical information persists
4. **Memory informs every interaction** — The Brain always checks memory before responding
5. **Memory consolidates over time** — Old conversations summarized, similar facts merged
6. **Privacy by default** — All memory is local, encrypted at rest, never transmitted

---

## 2. Memory Types & Hierarchy

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    JARVIS Memory System                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              WORKING MEMORY                              │    │
│  │  In-memory context window (current session)              │    │
│  │  Capacity: 2K-32K tokens (adaptive)                      │    │
│  │  Lifetime: Current interaction only                      │    │
│  │  Access: < 1ms                                           │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │ overflow / persist                     │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │              EPISODIC MEMORY                             │    │
│  │  Past conversations, tasks, events                       │    │
│  │  Storage: SQLite rows + ChromaDB embeddings              │    │
│  │  Capacity: Unlimited (disk-bound)                        │    │
│  │  Access: < 50ms (vector search)                          │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │ extracted facts                        │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │              SEMANTIC MEMORY                             │    │
│  │  Facts, knowledge, user preferences, project info        │    │
│  │  Storage: ChromaDB vector store                          │    │
│  │  Capacity: 100K+ vectors                                 │    │
│  │  Access: < 30ms (optimized HNSW)                         │    │
│  └──────────────────────┬──────────────────────────────────┘    │
│                         │ learned patterns                       │
│  ┌──────────────────────▼──────────────────────────────────┐    │
│  │              PROCEDURAL MEMORY                           │    │
│  │  Workflows, tool patterns, automation recipes            │    │
│  │  Storage: SQLite structured JSON                         │    │
│  │  Capacity: 10K entries                                   │    │
│  │  Access: < 10ms (indexed lookup)                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │           CONSOLIDATION ENGINE (Background)              │    │
│  │  • Summarize old episodic memories                       │    │
│  │  • Extract facts → semantic memory                       │    │
│  │  • Decay unimportant memories                            │    │
│  │  • Merge duplicate knowledge                             │    │
│  │  Runs every 30 minutes during idle                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Working Memory

### 3.1 Structure

```python
@dataclass
class WorkingMemory:
    """Active context for the current interaction."""
    
    # Current conversation
    messages: deque[Message]       # maxlen based on model context
    
    # Active task state
    current_task: Optional[Task]
    task_steps: list[StepResult]
    
    # Recently retrieved memories
    recalled_memories: list[MemoryEntry]
    
    # Active file contexts
    active_files: dict[str, str]   # path → content snippet
    
    # Agent states snapshot
    agent_states: dict[str, str]   # agent_id → state
    
    # Session metadata
    session_id: str
    started_at: float
    total_tokens_used: int
    
    def token_count(self) -> int:
        """Estimate total tokens in working memory."""
        return sum(estimate_tokens(m.content) for m in self.messages) + \
               sum(estimate_tokens(str(m)) for m in self.recalled_memories) + \
               sum(estimate_tokens(c) for c in self.active_files.values())
    
    def trim_to_budget(self, max_tokens: int):
        """Trim working memory to fit within token budget."""
        while self.token_count() > max_tokens and len(self.messages) > 2:
            # Remove oldest non-system message
            for i, msg in enumerate(self.messages):
                if msg.role != "system":
                    del self.messages[i]
                    break
```

### 3.2 Context Window Budget

```
Context Window Assembly (for a 4096-token model):
┌────────────────────────────────────────────────┐
│ System Prompt          │  ~400 tokens │ FIXED  │
│ Personality Prompt     │  ~150 tokens │ FIXED  │
│ Active Tools           │  ~300 tokens │ DYNAMIC│
│ Retrieved Memories     │  ~500 tokens │ DYNAMIC│
│ File Context           │ ~1000 tokens │ DYNAMIC│
│ Conversation History   │ ~1200 tokens │ SLIDING│
│ Current User Message   │  ~200 tokens │ FIXED  │
│ Reserved for Response  │  ~346 tokens │ BUFFER │
└────────────────────────────────────────────────┘

Priority order (what gets trimmed first):
1. Oldest conversation turns (summarize, then drop)
2. File context (reduce to relevant sections)
3. Retrieved memories (reduce k)
4. Tool definitions (filter to likely-needed only)
5. System prompt (NEVER trim)
```

---

## 4. Episodic Memory

### 4.1 What Gets Stored

Every interaction creates episodic memory entries:

```python
@dataclass
class EpisodicEntry:
    id: str                         # UUID
    type: str                       # "conversation", "task", "event", "observation"
    content: str                    # Full text content
    summary: str                    # LLM-generated summary (1-2 sentences)
    embedding: list[float]          # Vector embedding (384-dim)
    importance: float               # 0.0-1.0 importance score
    emotion: Optional[str]          # Detected emotional context
    entities: list[str]             # Extracted entities (people, projects, tech)
    tags: list[str]                 # Auto-generated tags
    conversation_id: str            # Parent conversation
    agent_involved: list[str]       # Which agents participated
    access_count: int = 0           # How often recalled
    last_accessed: Optional[float] = None
    created_at: float = field(default_factory=time.time)
    metadata: dict = field(default_factory=dict)
```

### 4.2 Importance Scoring

```python
def score_importance(message: str, context: dict) -> float:
    """Score memory importance from 0.0 (trivial) to 1.0 (critical)."""
    score = 0.3  # Base score
    
    # Content signals
    if any(w in message.lower() for w in ["important", "remember", "don't forget", "critical"]):
        score += 0.3
    if any(w in message.lower() for w in ["preference", "always", "never", "my name"]):
        score += 0.2
    if len(message) > 500:  # Longer messages often more important
        score += 0.1
    
    # Task signals
    if context.get("task_completed"):
        score += 0.2  # Completed tasks are worth remembering
    if context.get("error_occurred"):
        score += 0.15  # Errors teach lessons
    
    # User engagement signals
    if context.get("user_reacted_positively"):
        score += 0.1
    if context.get("user_corrected_jarvis"):
        score += 0.25  # Corrections are high-importance learning
    
    return min(1.0, score)
```

### 4.3 Episodic Recall

```python
async def recall_episodic(
    query: str,
    k: int = 5,
    time_range: Optional[tuple[float, float]] = None,
    conversation_id: Optional[str] = None,
    min_importance: float = 0.0
) -> list[EpisodicEntry]:
    """Recall episodic memories by semantic similarity."""
    
    # 1. Generate query embedding
    query_embedding = await embedding_model.embed(query)
    
    # 2. Search ChromaDB with filters
    filters = {}
    if time_range:
        filters["created_at"] = {"$gte": time_range[0], "$lte": time_range[1]}
    if conversation_id:
        filters["conversation_id"] = conversation_id
    if min_importance > 0:
        filters["importance"] = {"$gte": min_importance}
    
    results = episodic_collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        where=filters if filters else None,
    )
    
    # 3. Update access counts
    for entry_id in results["ids"][0]:
        await db.execute(
            "UPDATE episodic_memory SET access_count = access_count + 1, "
            "last_accessed = ? WHERE id = ?",
            (time.time(), entry_id)
        )
    
    return [_to_episodic_entry(r) for r in results]
```

---

## 5. Semantic Memory

### 5.1 Knowledge Categories

```python
SEMANTIC_CATEGORIES = {
    "user_preferences": {
        "description": "User's preferences, habits, and personal info",
        "examples": ["prefers dark mode", "uses Python for work", "name is Aniket"],
        "retention": "permanent",
    },
    "project_knowledge": {
        "description": "Information about user's projects",
        "examples": ["project X uses React", "API endpoint is /api/v2"],
        "retention": "permanent",
    },
    "learned_facts": {
        "description": "Facts learned from conversations",
        "examples": ["JavaScript closures work by...", "Docker compose syntax"],
        "retention": "long_term",
    },
    "environment_info": {
        "description": "User's system and environment details",
        "examples": ["uses Windows 11", "has RTX 4060", "Python 3.12 installed"],
        "retention": "update_on_change",
    },
    "relationship_context": {
        "description": "Information about people the user mentions",
        "examples": ["colleague named Alex works on backend", "manager is Sarah"],
        "retention": "long_term",
    },
}
```

### 5.2 Semantic Entry

```python
@dataclass
class SemanticEntry:
    id: str
    category: str                   # From SEMANTIC_CATEGORIES
    fact: str                       # The knowledge statement
    confidence: float               # 0.0-1.0 how sure we are
    source: str                     # "user_stated", "inferred", "corrected"
    embedding: list[float]
    created_at: float
    updated_at: float
    source_episodic_ids: list[str]  # Which conversations this came from
    metadata: dict
```

### 5.3 Semantic Operations

```python
class SemanticMemory:
    async def store_fact(self, fact: str, category: str, 
                         confidence: float = 0.8, source: str = "inferred"):
        """Store a new semantic fact."""
        # Check for contradictions
        existing = await self.recall(fact, k=3, min_similarity=0.85)
        for existing_fact in existing:
            if self._contradicts(fact, existing_fact.fact):
                # Newer information takes precedence
                await self.update_fact(existing_fact.id, fact, confidence)
                return
        
        embedding = await embed(fact)
        entry = SemanticEntry(
            id=str(uuid4()), category=category, fact=fact,
            confidence=confidence, source=source, embedding=embedding,
            created_at=time.time(), updated_at=time.time(),
            source_episodic_ids=[], metadata={}
        )
        
        await self.collection.add(
            ids=[entry.id],
            embeddings=[embedding],
            documents=[fact],
            metadatas=[{"category": category, "confidence": confidence,
                       "source": source, "created_at": entry.created_at}]
        )
    
    async def recall(self, query: str, k: int = 5, 
                     category: Optional[str] = None,
                     min_similarity: float = 0.0) -> list[SemanticEntry]:
        """Recall semantic facts by relevance."""
        query_embedding = await embed(query)
        
        where = {"category": category} if category else None
        
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            where=where,
        )
        
        # Filter by similarity threshold
        entries = []
        for i, (doc, distance) in enumerate(zip(results["documents"][0], results["distances"][0])):
            similarity = 1 - distance  # ChromaDB uses distance, convert to similarity
            if similarity >= min_similarity:
                entries.append(self._to_entry(results, i, similarity))
        
        return entries
```

---

## 6. Procedural Memory

### 6.1 What Gets Stored

Procedural memory stores "how to do things" — learned workflows, tool patterns, and automation recipes:

```python
@dataclass
class ProceduralEntry:
    id: str
    name: str                       # "deploy_to_vercel", "fix_import_error"
    description: str
    trigger_pattern: str            # When to suggest this procedure
    steps: list[dict]               # Ordered steps with tool calls
    tools_used: list[str]           # Which tools are involved
    success_count: int = 0
    failure_count: int = 0
    avg_duration_seconds: float = 0
    last_used: Optional[float] = None
    created_at: float = field(default_factory=time.time)
    learned_from: str = "observation"  # "observation", "user_taught", "self_discovered"
```

### 6.2 Learning from Observation

```python
async def learn_procedure(task_trace: TaskTrace):
    """Learn a reusable procedure from a completed task."""
    if task_trace.success and task_trace.steps_count >= 2:
        # Extract the pattern
        steps = [
            {
                "action": step.tool_name,
                "parameters_template": step.parameters,
                "description": step.description,
            }
            for step in task_trace.steps
        ]
        
        # Generate a name and trigger pattern using LLM
        summary = await llm.generate(
            f"Summarize this workflow in a short name and trigger pattern:\n"
            f"Steps: {steps}"
        )
        
        entry = ProceduralEntry(
            id=str(uuid4()),
            name=summary.name,
            description=summary.description,
            trigger_pattern=summary.trigger,
            steps=steps,
            tools_used=[s["action"] for s in steps],
            success_count=1,
            learned_from="observation"
        )
        
        await db.insert("procedural_memory", entry)
```

### 6.3 Procedure Suggestion

```python
async def suggest_procedure(user_message: str) -> Optional[ProceduralEntry]:
    """Check if we have a learned procedure for this request."""
    procedures = await db.query(
        "SELECT * FROM procedural_memory WHERE success_count > failure_count "
        "ORDER BY success_count DESC"
    )
    
    for proc in procedures:
        if await _matches_trigger(user_message, proc.trigger_pattern):
            return proc
    
    return None
```

---

## 7. Vector Storage (ChromaDB)

### 7.1 Collection Architecture

```python
# ChromaDB initialization
import chromadb
from chromadb.config import Settings

chroma_client = chromadb.PersistentClient(
    path="./data/vectors",
    settings=Settings(
        anonymized_telemetry=False,
        allow_reset=True,
        is_persistent=True,
    )
)

# Collections
COLLECTIONS = {
    "episodic": {
        "name": "episodic_memory",
        "description": "Conversation and event memories",
        "hnsw_space": "cosine",
        "expected_size": 50000,
    },
    "semantic": {
        "name": "semantic_knowledge",
        "description": "Facts and knowledge",
        "hnsw_space": "cosine",
        "expected_size": 20000,
    },
    "documents": {
        "name": "document_chunks",
        "description": "Indexed document chunks for RAG",
        "hnsw_space": "cosine",
        "expected_size": 100000,
    },
    "code": {
        "name": "code_snippets",
        "description": "Indexed code snippets",
        "hnsw_space": "cosine",
        "expected_size": 50000,
    },
}
```

### 7.2 HNSW Configuration

```python
# Tuned for personal-scale usage (< 100K vectors per collection)
HNSW_CONFIG = {
    "hnsw:space": "cosine",
    "hnsw:construction_ef": 128,   # Build quality (higher = better recall, slower build)
    "hnsw:search_ef": 64,          # Search quality (higher = better recall, slower search)
    "hnsw:M": 16,                  # Max connections per node
    "hnsw:num_threads": 4,         # Parallel build threads
}
```

### 7.3 FAISS Alternative (Optional)

```python
# FAISS for users who want faster vector search at scale
# Only used if user explicitly enables it or has > 100K vectors

import faiss

class FAISSStore:
    def __init__(self, dimension: int = 384):
        self.index = faiss.IndexFlatIP(dimension)  # Inner product (cosine after normalization)
        self.id_map: dict[int, str] = {}
    
    def add(self, embedding: list[float], doc_id: str):
        vec = np.array([embedding], dtype=np.float32)
        faiss.normalize_L2(vec)  # Normalize for cosine similarity
        idx = self.index.ntotal
        self.index.add(vec)
        self.id_map[idx] = doc_id
    
    def search(self, query: list[float], k: int = 5) -> list[tuple[str, float]]:
        vec = np.array([query], dtype=np.float32)
        faiss.normalize_L2(vec)
        distances, indices = self.index.search(vec, k)
        return [(self.id_map[idx], dist) for idx, dist in zip(indices[0], distances[0])]
```

---

## 8. SQLite Schema & Operations

### 8.1 Memory Tables

```sql
-- Episodic Memory (structured metadata, content + embedding in ChromaDB)
CREATE TABLE episodic_memory (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,              -- 'conversation', 'task', 'event', 'observation'
    content TEXT NOT NULL,
    summary TEXT,
    importance REAL DEFAULT 0.5,
    emotion TEXT,
    entities TEXT,                    -- JSON array of extracted entities
    tags TEXT,                       -- JSON array of tags
    conversation_id TEXT,
    agents_involved TEXT,            -- JSON array
    access_count INTEGER DEFAULT 0,
    last_accessed REAL,
    created_at REAL NOT NULL,
    metadata TEXT                    -- JSON
);

CREATE INDEX idx_episodic_importance ON episodic_memory(importance DESC);
CREATE INDEX idx_episodic_created ON episodic_memory(created_at DESC);
CREATE INDEX idx_episodic_conversation ON episodic_memory(conversation_id);
CREATE INDEX idx_episodic_type ON episodic_memory(type);

-- Semantic Memory (facts, knowledge)
CREATE TABLE semantic_memory (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    fact TEXT NOT NULL,
    confidence REAL DEFAULT 0.8,
    source TEXT DEFAULT 'inferred',
    source_episodic_ids TEXT,        -- JSON array
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    metadata TEXT                    -- JSON
);

CREATE INDEX idx_semantic_category ON semantic_memory(category);
CREATE INDEX idx_semantic_confidence ON semantic_memory(confidence DESC);

-- Procedural Memory (workflows, recipes)
CREATE TABLE procedural_memory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    trigger_pattern TEXT,
    steps TEXT NOT NULL,              -- JSON array of step objects
    tools_used TEXT,                  -- JSON array
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    avg_duration_seconds REAL DEFAULT 0,
    last_used REAL,
    created_at REAL NOT NULL,
    learned_from TEXT DEFAULT 'observation'
);

CREATE INDEX idx_procedural_success ON procedural_memory(success_count DESC);

-- Memory Consolidation Log
CREATE TABLE consolidation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,               -- 'summarize', 'merge', 'decay', 'extract'
    source_ids TEXT NOT NULL,         -- JSON array of affected memory IDs
    result TEXT,                      -- What was produced
    timestamp REAL NOT NULL
);
```

### 8.2 SQLite Configuration

```python
SQLITE_PRAGMAS = [
    "PRAGMA journal_mode = WAL",           # Write-ahead logging
    "PRAGMA synchronous = NORMAL",         # Balance safety/speed
    "PRAGMA cache_size = -8000",           # 8MB page cache
    "PRAGMA temp_store = MEMORY",          # In-memory temp tables
    "PRAGMA mmap_size = 268435456",        # 256MB memory-mapped I/O
    "PRAGMA foreign_keys = ON",
    "PRAGMA auto_vacuum = INCREMENTAL",    # Reclaim space gradually
    "PRAGMA busy_timeout = 5000",          # 5s busy wait
]
```

---

## 9. Embedding Pipeline

### 9.1 Model Selection

| Model | Dimensions | Speed | Quality | Use Case |
|---|---|---|---|---|
| all-MiniLM-L6-v2 | 384 | ~5ms | Good | **Default** — conversations, general text |
| nomic-embed-text | 768 | ~15ms | Very good | Documents, long text (if RAM allows) |
| CodeBERT | 768 | ~15ms | Good for code | Code snippets (if available) |
| all-mpnet-base-v2 | 768 | ~20ms | Excellent | Quality upgrade (16GB+ RAM) |

### 9.2 Embedding Pipeline

```python
class EmbeddingPipeline:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self._cache = LRUCache(maxsize=5000)  # Cache recent embeddings
    
    async def embed(self, text: str) -> list[float]:
        """Generate embedding for a text string."""
        # Check cache
        cache_key = hashlib.md5(text.encode()).hexdigest()
        if cached := self._cache.get(cache_key):
            return cached
        
        # Run in executor to avoid blocking event loop
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(
            None, self.model.encode, text
        )
        
        result = embedding.tolist()
        self._cache.set(cache_key, result)
        return result
    
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Batch embed for efficiency."""
        loop = asyncio.get_event_loop()
        embeddings = await loop.run_in_executor(
            None, self.model.encode, texts
        )
        return [e.tolist() for e in embeddings]
```

### 9.3 Chunking Strategy

```python
def chunk_text(text: str, max_tokens: int = 256, overlap_tokens: int = 50) -> list[str]:
    """Split text into overlapping chunks for embedding."""
    words = text.split()
    chunks = []
    
    i = 0
    while i < len(words):
        chunk_words = words[i:i + max_tokens]
        chunks.append(" ".join(chunk_words))
        i += max_tokens - overlap_tokens
    
    return chunks
```

---

## 10. Memory Consolidation Engine

### 10.1 Consolidation Tasks

```python
class MemoryConsolidator:
    """Background worker that maintains memory health."""
    
    CONSOLIDATION_INTERVAL = 1800  # 30 minutes
    
    async def run_cycle(self):
        """Run one consolidation cycle."""
        await self._summarize_old_conversations()
        await self._extract_semantic_facts()
        await self._decay_unimportant_memories()
        await self._merge_duplicate_knowledge()
        await self._update_access_statistics()
    
    async def _summarize_old_conversations(self):
        """Summarize conversations older than 7 days that haven't been summarized."""
        cutoff = time.time() - (7 * 24 * 3600)
        old_entries = await db.query(
            "SELECT * FROM episodic_memory WHERE created_at < ? AND summary IS NULL "
            "ORDER BY created_at LIMIT 20",
            (cutoff,)
        )
        
        for entry in old_entries:
            summary = await llm.generate(
                f"Summarize this conversation in 1-2 sentences, preserving key facts:\n"
                f"{entry.content}"
            )
            await db.execute(
                "UPDATE episodic_memory SET summary = ? WHERE id = ?",
                (summary, entry.id)
            )
    
    async def _extract_semantic_facts(self):
        """Extract reusable facts from recent conversations."""
        recent = await db.query(
            "SELECT * FROM episodic_memory WHERE type = 'conversation' "
            "AND created_at > ? AND importance > 0.5 LIMIT 20",
            (time.time() - 86400,)  # Last 24 hours
        )
        
        for entry in recent:
            facts = await llm.generate(
                f"Extract any factual information about the user, their preferences, "
                f"or their projects from this conversation. Return as JSON array of strings. "
                f"If no facts, return empty array.\n\n{entry.content}"
            )
            
            for fact in facts:
                await semantic_memory.store_fact(
                    fact=fact,
                    category=_classify_fact(fact),
                    source="inferred",
                    confidence=0.7
                )
    
    async def _decay_unimportant_memories(self):
        """Reduce importance of old, rarely-accessed memories."""
        # Memories older than 30 days with low access count
        cutoff = time.time() - (30 * 24 * 3600)
        await db.execute(
            "UPDATE episodic_memory SET importance = importance * 0.9 "
            "WHERE created_at < ? AND access_count < 3 AND importance > 0.1",
            (cutoff,)
        )
    
    async def _merge_duplicate_knowledge(self):
        """Find and merge duplicate semantic entries."""
        all_facts = await db.query("SELECT * FROM semantic_memory")
        
        # Find pairs with very high embedding similarity
        for i, fact_a in enumerate(all_facts):
            for fact_b in all_facts[i+1:]:
                similarity = cosine_similarity(fact_a.embedding, fact_b.embedding)
                if similarity > 0.92:  # Very similar facts
                    # Keep the one with higher confidence, merge metadata
                    keep = fact_a if fact_a.confidence >= fact_b.confidence else fact_b
                    remove = fact_b if keep == fact_a else fact_a
                    await db.execute("DELETE FROM semantic_memory WHERE id = ?", (remove.id,))
                    await self.collection.delete(ids=[remove.id])
```

---

## 11. Context Window Assembly

### 11.1 Assembly Pipeline

```python
async def assemble_context(
    user_message: str,
    conversation_history: list[Message],
    model_context_length: int,
    intent: str,
) -> ContextWindow:
    """Assemble the optimal context window for an LLM call."""
    
    budget = model_context_length
    context = ContextWindow()
    
    # 1. FIXED: System prompt (always included)
    system_prompt = get_system_prompt()
    context.system = system_prompt
    budget -= estimate_tokens(system_prompt)
    
    # 2. FIXED: User message (always included)
    context.user_message = user_message
    budget -= estimate_tokens(user_message)
    
    # 3. Reserve for response
    response_reserve = min(1024, budget // 4)
    budget -= response_reserve
    
    # 4. DYNAMIC: Retrieve relevant memories
    memories = await memory_agent.recall(user_message, k=5)
    memory_text = format_memories(memories)
    memory_tokens = estimate_tokens(memory_text)
    if memory_tokens < budget * 0.2:  # Max 20% for memories
        context.memories = memory_text
        budget -= memory_tokens
    else:
        # Reduce k until it fits
        while memory_tokens > budget * 0.2 and len(memories) > 1:
            memories = memories[:-1]
            memory_text = format_memories(memories)
            memory_tokens = estimate_tokens(memory_text)
        context.memories = memory_text
        budget -= memory_tokens
    
    # 5. DYNAMIC: Tools (filtered by intent)
    if intent in ("code", "automate", "file", "system"):
        relevant_tools = get_tools_for_intent(intent)
        tool_text = format_tools(relevant_tools)
        tool_tokens = estimate_tokens(tool_text)
        if tool_tokens < budget * 0.15:
            context.tools = tool_text
            budget -= tool_tokens
    
    # 6. SLIDING: Conversation history (fill remaining budget)
    history_messages = []
    for msg in reversed(conversation_history[-20:]):
        msg_tokens = estimate_tokens(msg.content)
        if budget - msg_tokens < 0:
            break
        history_messages.insert(0, msg)
        budget -= msg_tokens
    context.history = history_messages
    
    return context
```

---

## 12. Memory API & Agent Integration

### 12.1 Memory Agent API

```python
class MemoryAgent(BaseAgent):
    """Unified API for all memory operations."""
    
    async def store(self, content: str, memory_type: str = "episodic",
                    importance: float = 0.5, metadata: dict = None):
        """Store a memory entry."""
        if memory_type == "episodic":
            await self.episodic.store(content, importance, metadata)
        elif memory_type == "semantic":
            await self.semantic.store_fact(content, _classify_fact(content))
        elif memory_type == "procedural":
            await self.procedural.store(content)
    
    async def recall(self, query: str, k: int = 5, 
                     memory_types: list[str] = None) -> list[MemoryEntry]:
        """Recall memories across all types, ranked by relevance."""
        types = memory_types or ["episodic", "semantic", "procedural"]
        
        all_results = []
        
        if "episodic" in types:
            episodic = await self.episodic.recall(query, k=k)
            all_results.extend(episodic)
        
        if "semantic" in types:
            semantic = await self.semantic.recall(query, k=k)
            all_results.extend(semantic)
        
        if "procedural" in types:
            procedural = await self.procedural.search(query, k=k)
            all_results.extend(procedural)
        
        # Sort by relevance score, return top k
        all_results.sort(key=lambda r: r.relevance_score, reverse=True)
        return all_results[:k]
    
    async def forget(self, memory_id: str):
        """Delete a specific memory (user request)."""
        # Delete from SQLite
        await db.execute("DELETE FROM episodic_memory WHERE id = ?", (memory_id,))
        await db.execute("DELETE FROM semantic_memory WHERE id = ?", (memory_id,))
        # Delete from ChromaDB
        for collection in [self.episodic_collection, self.semantic_collection]:
            try:
                collection.delete(ids=[memory_id])
            except:
                pass  # May not exist in this collection
```

---

## 13. Checkpointing & Durability

### 13.1 Inspired by LangGraph Checkpointing

```python
class ConversationCheckpoint:
    """Save and restore conversation state for durability."""
    
    async def save(self, session_id: str, state: dict):
        """Save a checkpoint of current conversation state."""
        await db.execute(
            "INSERT OR REPLACE INTO checkpoints (session_id, state, timestamp) "
            "VALUES (?, ?, ?)",
            (session_id, json.dumps(state), time.time())
        )
    
    async def restore(self, session_id: str) -> Optional[dict]:
        """Restore conversation state from checkpoint."""
        row = await db.query_one(
            "SELECT state FROM checkpoints WHERE session_id = ? "
            "ORDER BY timestamp DESC LIMIT 1",
            (session_id,)
        )
        return json.loads(row["state"]) if row else None
```

### 13.2 Crash Recovery

If JARVIS crashes mid-conversation:
1. On restart, detect incomplete session from checkpoint
2. Restore working memory from last checkpoint
3. Notify user: "I recovered from an unexpected restart. Here's where we were..."
4. Resume from last known good state

---

## 14. Performance & Scaling

### 14.1 Performance Targets

| Operation | Target | Implementation |
|---|---|---|
| Memory store | < 10ms | Async SQLite + batch ChromaDB |
| Memory recall (top 5) | < 50ms | HNSW vector search |
| Embedding generation | < 20ms | MiniLM-L6 on CPU |
| Context assembly | < 30ms | Cached embeddings + pruned search |
| Consolidation cycle | < 60s | Background worker, non-blocking |
| Full reindex | < 5 min | Batch processing, progress streaming |

### 14.2 Scaling Limits

| Metric | Limit | Mitigation |
|---|---|---|
| Episodic entries | 100K | Consolidation reduces volume |
| Semantic facts | 50K | Merge duplicates |
| Procedural entries | 10K | Prune low-success entries |
| Vector index size | ~500MB on disk | Acceptable for local use |
| SQLite DB size | ~200MB | WAL + incremental vacuum |
| Embedding cache | 5K entries / ~50MB | LRU eviction |

---

*This document specifies the complete memory architecture for JARVIS. Memory is what makes JARVIS feel intelligent and personal — it must be implemented with care.*

*Last Updated: 2026-05-19*
