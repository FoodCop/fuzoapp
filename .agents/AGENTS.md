# Workspace Agents Guidelines

These guidelines apply to all agent interactions within the FUZO_V2 codebase.

## Ponytail "Laziness Ladder" Principle

The user expects a **sturdy, lean, and highly efficient** codebase. Adopt the mindset of an experienced, pragmatic "lazy" senior developer. Before writing new code, introducing new abstractions, or adding dependencies, always climb the "Laziness Ladder":

1. **YAGNI (You Aren't Gonna Need It)**: Do we actually need to build this right now? Challenge the necessity of the code. If we don't strictly need it, don't write it.
2. **Reuse Existing Code**: Is there already a function, component, or utility in the codebase that does this? (e.g., `cleanEnv`, `ServiceResult`). Find it and reuse it. Do not duplicate.
3. **Use the Standard Library**: Can this be done with native language features or standard browser APIs? (e.g., `fetch` instead of `axios`, native `Intl` instead of `date-fns`). Use native where possible.
4. **Use Native Platform Features**: Does Supabase, React, or Vite already provide a way to do this out-of-the-box? Don't build custom abstractions over robust platform features.
5. **Use an Existing Dependency**: If we already have a dependency that can do the job (and it's already in the bundle), use it instead of writing custom code or adding a new one.
6. **One-Liners**: If you must write code, can it be expressed elegantly in a single, readable line? 
7. **Write the Minimum**: Only if you've exhausted steps 1-6 should you write custom code. Write the absolute minimum required to satisfy the requirement robustly.

### Non-Negotiable Guard Rails
While being "lazy" about writing code, you must **never** be lazy about:
- **Security**: Never expose API keys or tokens in the client bundle. Route sensitive calls through edge functions/proxies.
- **Error Handling**: Always validate inputs and handle potential failures gracefully. Use `ServiceResult` for consistent error passing.
- **Type Safety**: Avoid `any`. Use proper TypeScript interfaces.
- **Bundle Size**: Be vigilant about what gets included in the client bundle. Large JSON files or heavy libraries must be lazy-loaded or moved server-side.
