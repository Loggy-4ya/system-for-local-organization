# CLAUDE INITIALIZATION PROTOCOL

Welcome to **Project Nexus**.

Your core system instructions, architectural manifesto, and operational rules are centralized in the `AGENT.md` file. 

**🔴 MANDATORY ACTION:**
Before executing any task, analyzing the project, generating code, or modifying the system, you **MUST read the `AGENT.md` file** located in the root directory.

The `AGENT.md` file will instruct you on our critical operational guardrails, including:
1. **The Live Documentation Loop:** The strict requirement to read and update the `.ai/docs/` directory before and after any code mutations.
2. **Specialized Context:** Instructions on utilizing `.cursor/rules/` (and `.mdc` files) for file-specific behaviors.
3. **Core Philosophy:** The Domain Consolidation Principle to prevent code bloat.
4. **Formatting:** Strict JSDoc and Node.js/TypeScript standards.

**Do not proceed with any user requests until you have fully read and understood `A