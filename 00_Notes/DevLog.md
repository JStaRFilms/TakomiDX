# TakomiDX — Development Log

**Project spawned:** 2026-03-07  
**Client:** N/A

## Technical Specs

- Language: 
- Framework: 

## Log

### 2026-03-07 - Initial Setup
- [x] Create project
- [ ] 


After reading everything you’ve said and done, there’s a major flaw—not in your explanation, but in the implementation. It can’t work in real life because we’re asking developers to abandon the tools they live in every day.

If we’re building a full application they’ll use constantly, why would they prefer that over their normal workflow? Maybe we package the whole thing, give it root access, and install it. Then, from any terminal, I just run `takomi pnpm dev`. It looks normal, but the command is sent to a dashboard that tracks it and redirects localhost or whatever. I don’t know how to explain it.

Alternatively, we build our own UI: a chat window in the center, pick the LLM at the bottom, open multiple chats in parallel. Most of these models have CLI tools, so each chat spawns a sub-instance of the CLI, everything containerized in Docker. One click on the dashboard link opens the app—even though it’s technically not on port 3000 because we proxy it.

The current implementation is nowhere near what actually makes sense, but it’s good that I wrote it down and understand it; now we can narrow it down.