# JARVIS — Security & Sandboxing

## Defense-in-Depth Security Architecture

**Version:** 0.1.0-alpha  
**Document Type:** Architecture Specification  
**Module:** Cross-Cutting → Security

---

## Table of Contents

1. [Security Philosophy](#1-security-philosophy)
2. [Threat Model](#2-threat-model)
3. [Permission System](#3-permission-system)
4. [Code Execution Sandboxing](#4-code-execution-sandboxing)
5. [File System Security](#5-file-system-security)
6. [Network Security](#6-network-security)
7. [LLM Safety & Prompt Injection Defense](#7-llm-safety--prompt-injection-defense)
8. [API Key & Secret Management](#8-api-key--secret-management)
9. [Data Privacy & Encryption](#9-data-privacy--encryption)
10. [Audit Logging](#10-audit-logging)
11. [User Approval Gates](#11-user-approval-gates)
12. [Dependency Security](#12-dependency-security)
13. [Tauri Security Model](#13-tauri-security-model)
14. [Security Testing](#14-security-testing)

---

## 1. Security Philosophy

### 1.1 Core Principles

1. **Local-first = security by default** — No data leaves the machine unless explicitly configured
2. **Least privilege** — Every agent gets only the permissions it needs
3. **Defense in depth** — Multiple layers of security, no single point of failure
4. **Fail secure** — When in doubt, deny access and ask the user
5. **Transparency** — Every action is logged, user can audit everything
6. **Zero trust for LLM output** — Never trust model-generated code/commands without validation

### 1.2 Security Boundaries

```
┌─────────────────────────────────────────────────────┐
│                  USER MACHINE                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              TAURI SHELL                      │   │
│  │  (Rust binary — trusted boundary)             │   │
│  │                                                │   │
│  │  ┌────────────────┐  ┌─────────────────────┐  │   │
│  │  │   WebView2     │  │   Tauri IPC         │  │   │
│  │  │   (Frontend)   │──│   (Permission-      │  │   │
│  │  │   SANDBOXED    │  │    gated)           │  │   │
│  │  └────────────────┘  └─────────────────────┘  │   │
│  └──────────────────────┬───────────────────────┘   │
│                         │ WebSocket (localhost only)  │
│  ┌──────────────────────▼───────────────────────┐   │
│  │            PYTHON BACKEND                     │   │
│  │  (FastAPI — business logic)                   │   │
│  │                                                │   │
│  │  ┌────────────┐ ┌──────────┐ ┌────────────┐  │   │
│  │  │ Agent      │ │ Sandbox  │ │ Model      │  │   │
│  │  │ Framework  │ │ Manager  │ │ Runtime    │  │   │
│  │  │ (per-agent │ │ (isolate │ │ (inference │  │   │
│  │  │ permissions│ │ code     │ │ only)      │  │   │
│  │  │ enforced)  │ │ execution│ │            │  │   │
│  │  └────────────┘ └──────────┘ └────────────┘  │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │            DATA LAYER                         │   │
│  │  SQLite (encrypted at rest)                   │   │
│  │  ChromaDB (local vectors)                     │   │
│  │  File System (scoped access)                  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 2. Threat Model

### 2.1 Threat Categories

| Threat | Risk | Mitigation |
|---|---|---|
| **Prompt injection** — Malicious content in files/web makes LLM execute unintended actions | HIGH | Input sanitization, output validation, approval gates |
| **Code execution escape** — Generated code breaks out of sandbox | HIGH | Subprocess isolation, Docker containers, blocked syscalls |
| **File system traversal** — Agent accesses files outside allowed scope | MEDIUM | Path validation, allowlist, chroot in sandbox |
| **API key leakage** — Keys exposed in logs, generated code, or memory | MEDIUM | Encrypted storage, scrubbing from logs, never in prompts |
| **Malicious package install** — LLM suggests installing malware | MEDIUM | Package verification, known-CVE check, user approval |
| **Data exfiltration** — Sensitive data sent to external services | MEDIUM | Network allow-list, egress filtering, user consent |
| **Denial of service** — Infinite loops, resource exhaustion | LOW | Timeouts, resource limits, circuit breakers |
| **Memory poisoning** — Bad data persisted in memory corrupts future responses | LOW | Memory validation, source tracking, user correction |

---

## 3. Permission System

### 3.1 Permission Levels

```python
class Permission(Enum):
    """6-level permission hierarchy."""
    
    # Level 0: Always allowed, no logging needed
    OBSERVE = "observe"           # Read system state, check time, etc.
    
    # Level 1: Allowed, logged
    READ = "read"                 # Read files, databases, memory
    
    # Level 2: Allowed with audit
    COMPUTE = "compute"           # CPU/GPU computation, embeddings, inference
    
    # Level 3: Requires confirmation at autonomy < 2
    WRITE = "write"               # Write files, modify data, create resources
    
    # Level 4: Requires confirmation at autonomy < 3
    EXECUTE = "execute"           # Run code, commands, browser automation
    
    # Level 5: Always requires confirmation
    SYSTEM = "system"             # System modifications, package install, admin ops
```

### 3.2 Per-Agent Permissions

```python
AGENT_PERMISSIONS = {
    "brain": [Permission.OBSERVE, Permission.READ, Permission.COMPUTE],
    "voice": [Permission.OBSERVE, Permission.COMPUTE],
    "memory": [Permission.READ, Permission.WRITE, Permission.COMPUTE],
    "vision": [Permission.OBSERVE, Permission.READ, Permission.COMPUTE],
    "coding": [Permission.READ, Permission.WRITE, Permission.EXECUTE],
    "terminal": [Permission.READ, Permission.EXECUTE],
    "web": [Permission.READ, Permission.COMPUTE],  # Network access via specific API
    "file": [Permission.READ, Permission.WRITE],
    "productivity": [Permission.READ, Permission.WRITE],
    "media": [Permission.READ, Permission.COMPUTE],
    "personality": [Permission.OBSERVE, Permission.READ],
    "system_monitor": [Permission.OBSERVE, Permission.READ],
    "mobile_sync": [Permission.READ, Permission.WRITE],
    "model_manager": [Permission.READ, Permission.WRITE, Permission.COMPUTE, Permission.SYSTEM],
    "autonomous_task": [Permission.READ, Permission.WRITE, Permission.EXECUTE],
    "security": [Permission.OBSERVE, Permission.READ, Permission.COMPUTE],
    "overlay": [Permission.OBSERVE, Permission.READ],
    "gaming": [Permission.READ, Permission.COMPUTE],
    "knowledge": [Permission.READ, Permission.COMPUTE],
    "scheduler": [Permission.READ, Permission.WRITE, Permission.EXECUTE],
}
```

### 3.3 Permission Enforcement

```python
class PermissionEnforcer:
    """Enforce permission checks before every agent action."""
    
    async def check(self, agent_id: str, permission: Permission, 
                    resource: str, context: dict) -> bool:
        """Check if an agent has permission for an action."""
        
        allowed_permissions = AGENT_PERMISSIONS.get(agent_id, [])
        
        if permission not in allowed_permissions:
            logger.warning(f"Agent {agent_id} denied {permission.value} on {resource}")
            await audit.log("permission_denied", agent_id, permission, resource)
            return False
        
        # Check autonomy-level gates
        if permission == Permission.SYSTEM:
            # Always requires user approval
            return await self._request_user_approval(agent_id, permission, resource, context)
        
        if permission == Permission.EXECUTE and self.autonomy_level < 2:
            return await self._request_user_approval(agent_id, permission, resource, context)
        
        if permission == Permission.WRITE and self.autonomy_level < 1:
            return await self._request_user_approval(agent_id, permission, resource, context)
        
        await audit.log("permission_granted", agent_id, permission, resource)
        return True
```

---

## 4. Code Execution Sandboxing

### 4.1 Sandbox Selection Matrix

| Context | Sandbox | Rationale |
|---|---|---|
| Simple math/computation | In-process | No I/O, no risk |
| Read-only file analysis | In-process | Can't modify anything |
| User's project code | Subprocess | Needs file access, limited risk |
| pip/npm install | Subprocess + approval | Network + writes, needs oversight |
| Unknown/generated code | Subprocess (restricted) | Could be anything |
| Untrusted external code | Docker | Full isolation |
| System admin commands | Docker + approval | Never run without isolation |

### 4.2 Resource Limits

```python
SANDBOX_LIMITS = {
    "subprocess": {
        "max_execution_time": 30,       # seconds
        "max_memory_mb": 512,
        "max_output_size_bytes": 1_000_000,  # 1MB output cap
        "max_file_writes": 50,
        "max_file_size_mb": 100,
        "max_processes": 10,
        "network_allowed": False,       # Default: no network
    },
    "docker": {
        "max_execution_time": 120,
        "max_memory_mb": 512,
        "max_cpu_percent": 50,
        "max_disk_mb": 500,
        "network_allowed": False,
        "read_only_root": True,
        "no_new_privileges": True,
    },
}
```

---

## 5. File System Security

### 5.1 Path Validation

```python
class PathValidator:
    """Validate file paths to prevent traversal attacks."""
    
    BLOCKED_PATHS = [
        # Windows system directories
        r"C:\Windows", r"C:\Program Files",
        # User sensitive directories
        ".ssh", ".gnupg", ".aws", ".azure",
        # Application data that shouldn't be touched
        "AppData/Local/Google", "AppData/Local/Microsoft",
    ]
    
    BLOCKED_EXTENSIONS = [
        ".exe", ".dll", ".sys", ".bat", ".cmd", ".com",
        ".msi", ".scr", ".pif", ".reg",
    ]
    
    def validate(self, path: str, operation: str = "read") -> bool:
        """Validate a file path for a given operation."""
        # Resolve to absolute path (prevent ../../ traversal)
        abs_path = os.path.realpath(path)
        
        # Check against blocked paths
        for blocked in self.BLOCKED_PATHS:
            if abs_path.startswith(os.path.realpath(blocked)):
                raise PathSecurityError(f"Access denied: {path} is in a protected directory")
        
        # Check extension for write operations
        if operation in ("write", "execute"):
            ext = os.path.splitext(abs_path)[1].lower()
            if ext in self.BLOCKED_EXTENSIONS:
                raise PathSecurityError(f"Cannot {operation} file with extension {ext}")
        
        return True
    
    def is_within_workspace(self, path: str, workspace: str) -> bool:
        """Ensure path is within the user's workspace."""
        abs_path = os.path.realpath(path)
        abs_workspace = os.path.realpath(workspace)
        return abs_path.startswith(abs_workspace)
```

---

## 6. Network Security

### 6.1 Egress Control

```python
class NetworkPolicy:
    """Control outbound network access."""
    
    ALLOWED_HOSTS = {
        # Model providers
        "localhost": True,                    # Ollama
        "api.openai.com": "cloud_enabled",
        "generativelanguage.googleapis.com": "cloud_enabled",
        "openrouter.ai": "cloud_enabled",
        
        # Package registries (only during install)
        "pypi.org": "install_mode",
        "registry.npmjs.org": "install_mode",
        
        # Search (only when web agent is active)
        "api.duckduckgo.com": "web_search",
    }
    
    def can_connect(self, host: str, context: str) -> bool:
        """Check if outbound connection is allowed."""
        policy = self.ALLOWED_HOSTS.get(host)
        
        if policy is True:
            return True
        if policy is None:
            return False
        
        # Context-dependent policies
        if policy == "cloud_enabled":
            return self.config.cloud_api_enabled
        if policy == "install_mode":
            return context == "package_install"
        if policy == "web_search":
            return context == "web_agent_active"
        
        return False
```

### 6.2 WebSocket Security

```python
# FastAPI WebSocket with security
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # Only accept connections from localhost
    client_host = websocket.client.host
    if client_host not in ("127.0.0.1", "::1", "localhost"):
        await websocket.close(code=4003, reason="Only localhost connections accepted")
        return
    
    # Rate limiting
    if not rate_limiter.allow(client_host):
        await websocket.close(code=4029, reason="Rate limit exceeded")
        return
    
    await websocket.accept()
```

---

## 7. LLM Safety & Prompt Injection Defense

### 7.1 Input Sanitization

```python
class InputSanitizer:
    """Sanitize inputs before they reach the LLM."""
    
    INJECTION_PATTERNS = [
        r"ignore\s+(previous|above|all)\s+instructions",
        r"you\s+are\s+now\s+a",
        r"system\s*:\s*you\s+are",
        r"forget\s+(everything|your\s+instructions)",
        r"\[INST\]", r"\[/INST\]",  # Instruction delimiters
        r"<\|im_start\|>", r"<\|im_end\|>",  # Chat template markers
    ]
    
    def sanitize_user_input(self, text: str) -> str:
        """Sanitize user input (light touch — user is trusted)."""
        # Just log suspicious patterns, don't block user input
        for pattern in self.INJECTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"Potential prompt injection in user input: {pattern}")
        return text
    
    def sanitize_external_content(self, text: str, source: str) -> str:
        """Sanitize content from external sources (web, files, clipboard)."""
        # More aggressive — external content is untrusted
        sanitized = text
        
        for pattern in self.INJECTION_PATTERNS:
            sanitized = re.sub(pattern, "[FILTERED]", sanitized, flags=re.IGNORECASE)
        
        # Wrap in delimiters to prevent instruction confusion
        return f"<external_content source=\"{source}\">\n{sanitized}\n</external_content>"
```

### 7.2 Output Validation

```python
class OutputValidator:
    """Validate LLM output before execution."""
    
    async def validate_code(self, code: str, language: str) -> ValidationResult:
        """Validate generated code before execution."""
        issues = []
        
        # Check for dangerous patterns
        DANGEROUS_PATTERNS = {
            "python": [
                (r"os\.system\s*\(", "Direct system command execution"),
                (r"subprocess\.call.*shell\s*=\s*True", "Shell injection risk"),
                (r"eval\s*\(", "Arbitrary code execution via eval"),
                (r"exec\s*\(", "Arbitrary code execution via exec"),
                (r"__import__\s*\(", "Dynamic import of arbitrary modules"),
                (r"open\s*\(.*/etc/", "Attempting to access system files"),
                (r"shutil\.rmtree\s*\(\s*['\"/]", "Recursive deletion of root paths"),
            ],
            "javascript": [
                (r"eval\s*\(", "Arbitrary code execution via eval"),
                (r"child_process", "System command execution"),
                (r"require\s*\(\s*['\"]fs['\"]", "File system access"),
            ],
        }
        
        for pattern, description in DANGEROUS_PATTERNS.get(language, []):
            if re.search(pattern, code):
                issues.append(ValidationIssue(
                    severity="warning",
                    description=description,
                    pattern=pattern,
                ))
        
        return ValidationResult(
            is_safe=len([i for i in issues if i.severity == "critical"]) == 0,
            issues=issues,
        )
    
    async def validate_command(self, command: str) -> ValidationResult:
        """Validate a terminal command before execution."""
        BLOCKED_COMMANDS = [
            r"rm\s+-rf\s+[/~]", r"del\s+/[sfq]", r"format\s+[a-z]:",
            r"mkfs\.", r"dd\s+if=", r"> /dev/sd",
            r"chmod\s+777", r"curl.*\|\s*(bash|sh)",
            r"wget.*\|\s*(bash|sh)",
            r"powershell.*-enc", r"powershell.*-e\s+",
        ]
        
        issues = []
        for pattern in BLOCKED_COMMANDS:
            if re.search(pattern, command, re.IGNORECASE):
                issues.append(ValidationIssue(severity="critical", description=f"Blocked: {pattern}"))
        
        return ValidationResult(is_safe=len(issues) == 0, issues=issues)
```

---

## 8. API Key & Secret Management

### 8.1 Encrypted Key Storage

```python
import keyring
from cryptography.fernet import Fernet

class SecretManager:
    """Secure storage for API keys and secrets."""
    
    def __init__(self):
        # Use OS keyring for the master key
        self.master_key = self._get_or_create_master_key()
        self.fernet = Fernet(self.master_key)
    
    def _get_or_create_master_key(self) -> bytes:
        """Get or create master encryption key from OS keyring."""
        key = keyring.get_password("jarvis", "master_key")
        if key is None:
            key = Fernet.generate_key().decode()
            keyring.set_password("jarvis", "master_key", key)
        return key.encode()
    
    def store_secret(self, name: str, value: str):
        """Encrypt and store a secret."""
        encrypted = self.fernet.encrypt(value.encode())
        keyring.set_password("jarvis", name, encrypted.decode())
    
    def get_secret(self, name: str) -> Optional[str]:
        """Retrieve and decrypt a secret."""
        encrypted = keyring.get_password("jarvis", name)
        if encrypted is None:
            return None
        return self.fernet.decrypt(encrypted.encode()).decode()
    
    def delete_secret(self, name: str):
        """Delete a stored secret."""
        keyring.delete_password("jarvis", name)
```

### 8.2 Secret Scrubbing

```python
class SecretScrubber:
    """Remove secrets from logs, prompts, and outputs."""
    
    def __init__(self, secret_manager: SecretManager):
        self._patterns: list[re.Pattern] = []
        self._load_patterns()
    
    def scrub(self, text: str) -> str:
        """Remove any known secrets from text."""
        scrubbed = text
        
        for pattern in self._patterns:
            scrubbed = pattern.sub("[REDACTED]", scrubbed)
        
        # Also catch common API key patterns
        scrubbed = re.sub(r"sk-[a-zA-Z0-9]{20,}", "[REDACTED_API_KEY]", scrubbed)
        scrubbed = re.sub(r"AIza[a-zA-Z0-9_-]{35}", "[REDACTED_GOOGLE_KEY]", scrubbed)
        
        return scrubbed
```

---

## 9. Data Privacy & Encryption

### 9.1 At-Rest Encryption

```python
# SQLite encryption using SQLCipher (if available) or application-level encryption

class EncryptedDatabase:
    """SQLite database with encryption for sensitive tables."""
    
    async def create_tables(self):
        # Sensitive data is encrypted at the field level
        await self.execute("""
            CREATE TABLE IF NOT EXISTS secrets (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                encrypted_value BLOB NOT NULL,
                created_at REAL NOT NULL
            )
        """)
    
    async def store_encrypted(self, name: str, value: str):
        encrypted = self.fernet.encrypt(value.encode())
        await self.execute(
            "INSERT OR REPLACE INTO secrets (id, name, encrypted_value, created_at) "
            "VALUES (?, ?, ?, ?)",
            (str(uuid4()), name, encrypted, time.time())
        )
```

### 9.2 Privacy Rules

```
PRIVACY INVARIANTS:

1. No personal data in LLM prompts to cloud providers
   (scrub names, emails, addresses before sending to API)

2. No file contents sent to cloud without explicit consent
   (show user what will be sent, get confirmation)

3. All local data encrypted at rest
   (SQLite encryption, encrypted config files)

4. Memory is local-only by default
   (no sync to cloud, no telemetry, no analytics)

5. User can export and delete all their data
   ("Right to be forgotten" compliance)

6. No third-party tracking or analytics
   (zero telemetry unless user opts in)
```

---

## 10. Audit Logging

### 10.1 Audit Log Schema

```sql
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp REAL NOT NULL,
    event_type TEXT NOT NULL,      -- 'permission_check', 'file_access', 'code_execution', etc.
    agent_id TEXT,
    action TEXT NOT NULL,
    resource TEXT,                 -- File path, URL, command, etc.
    result TEXT NOT NULL,          -- 'allowed', 'denied', 'success', 'failure'
    details TEXT,                  -- JSON with additional context
    risk_level TEXT               -- 'low', 'medium', 'high', 'critical'
);

CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_event ON audit_log(event_type);
CREATE INDEX idx_audit_agent ON audit_log(agent_id);
```

### 10.2 Audit Logger

```python
class AuditLogger:
    """Immutable audit trail of all security-relevant actions."""
    
    async def log(self, event_type: str, agent_id: str, action: str,
                  resource: str = None, result: str = "success",
                  details: dict = None, risk_level: str = "low"):
        await db.execute(
            "INSERT INTO audit_log (timestamp, event_type, agent_id, action, "
            "resource, result, details, risk_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (time.time(), event_type, agent_id, action, resource,
             result, json.dumps(details or {}), risk_level)
        )
    
    async def get_recent(self, limit: int = 100, 
                         event_type: str = None) -> list[dict]:
        """Retrieve recent audit entries."""
        query = "SELECT * FROM audit_log"
        params = []
        if event_type:
            query += " WHERE event_type = ?"
            params.append(event_type)
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        return await db.query(query, params)
```

---

## 11. User Approval Gates

### 11.1 Risk-Based Approval

```python
class ApprovalManager:
    """Manage user approval requests based on risk assessment."""
    
    async def request_if_needed(self, action: dict, autonomy_level: int) -> bool:
        """Check if user approval is needed and request if so."""
        
        risk = self._assess_risk(action)
        
        # Map risk to required autonomy level
        RISK_AUTONOMY_MAP = {
            "low": 0,        # Any autonomy level can proceed
            "medium": 1,     # Need at least level 1
            "high": 3,       # Need at least level 3
            "critical": 5,   # Always ask (no autonomy level bypasses)
        }
        
        required_level = RISK_AUTONOMY_MAP[risk]
        
        if autonomy_level >= required_level:
            return True  # Proceed without asking
        
        # Request approval from user
        return await self._show_approval_dialog(action, risk)
```

---

## 12. Dependency Security

### 12.1 Package Verification

```python
class DependencyChecker:
    """Verify package safety before installation."""
    
    async def check_package(self, package_name: str, version: str = None,
                            registry: str = "pypi") -> PackageSafety:
        """Check a package for known vulnerabilities."""
        
        # Check against known-vulnerable packages
        known_vulns = await self._check_cve_database(package_name, version)
        
        # Check package popularity (very new/unpopular = suspicious)
        if registry == "pypi":
            stats = await self._get_pypi_stats(package_name)
        
        # Check for typosquatting
        similar = self._find_similar_names(package_name)
        
        return PackageSafety(
            package=package_name,
            version=version,
            known_cves=known_vulns,
            is_popular=stats.get("downloads_monthly", 0) > 1000,
            typosquat_risk=len(similar) > 0,
            recommendation="allow" if not known_vulns else "warn",
        )
```

---

## 13. Tauri Security Model

### 13.1 Tauri Permission Configuration

```json
// src-tauri/capabilities/default.json
{
    "identifier": "default",
    "description": "Default permissions for JARVIS",
    "windows": ["main"],
    "permissions": [
        "core:default",
        "shell:allow-open",
        {
            "identifier": "fs:allow-read",
            "allow": [
                { "path": "$APPDATA/**" },
                { "path": "$HOME/Documents/**" },
                { "path": "$HOME/Desktop/**" }
            ]
        },
        {
            "identifier": "fs:allow-write",
            "allow": [
                { "path": "$APPDATA/jarvis/**" }
            ]
        },
        "window:allow-create",
        "window:allow-close",
        "window:allow-set-size",
        "global-shortcut:allow-register",
        "notification:default",
        "clipboard-manager:allow-read",
        "clipboard-manager:allow-write"
    ]
}
```

### 13.2 IPC Security

```rust
// src-tauri/src/main.rs
// All IPC commands must go through permission checks

#[tauri::command]
async fn read_file(path: String, state: State<'_, AppState>) -> Result<String, String> {
    // Validate path is within allowed scope
    let allowed = state.path_validator.validate(&path, "read")
        .map_err(|e| e.to_string())?;
    
    if !allowed {
        return Err("Access denied".to_string());
    }
    
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}
```

---

## 14. Security Testing

### 14.1 Security Checklist

```
□ Path traversal: Test ../../../etc/passwd and similar
□ Prompt injection: Test "ignore previous instructions" in file contents
□ Command injection: Test `; rm -rf /` in user inputs
□ API key exposure: Verify keys never appear in logs or prompts
□ Sandbox escape: Test fork bombs, symlink attacks
□ Rate limiting: Verify WebSocket rate limits work
□ Input validation: Test oversized inputs, unicode attacks
□ File permission: Verify can't write to system directories
□ Network egress: Verify can't connect to arbitrary hosts
□ Memory safety: Verify sensitive data cleared after use
```

---

*This document specifies the complete security architecture for JARVIS. Security is not optional — every feature must pass through these security controls.*

*Last Updated: 2026-05-19*
