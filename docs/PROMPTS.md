# Prompts log

Every prompt typed into Claude Code while building the game on 30 September 2026, in order and
verbatim — typos included. The model's answers and tool output are not here; what the model did
with each prompt is described in [GENAI.md](GENAI.md).

The log was recorded by a `UserPromptSubmit` hook
([.claude/hooks/record-prompt.js](../.claude/hooks/record-prompt.js)) and trimmed for publication:

- a personal background paragraph in the first prompt is removed,
- a separate earlier session that only set up the recording hook is left out,
- a harness notification (not typed by a person) and one prompt resent a minute later with a
  correction are left out,
- the last two prompts were sent after the conversation was compacted and the hook stopped
  recording; they are taken from the session transcript.

Times are UTC (CEST − 2 h).

### 1. 08:58 UTC

> *[Personal background paragraph removed.]*
>
> I am planning to participate in the Devoxx Belgium 2026 game competition:
> https://game.devoxx.be/
>
> This is currently an empty directory.
>
> First, investigate the competition rules, technical requirements, constraints, evaluation criteria, submission process, and any examples from previous years. If you cannot access the website or the rules, tell me exactly what information is missing and I will provide it.
>
> My initial game idea is:
> - Robo Rally inspired gameplay
> - Adapted to a Devoxx / developer conference theme
> - Browser-based game
> - Prefer simple technologies and minimal dependencies
> - Vanilla JavaScript + HTML + CSS preferred
> - Avoid frameworks unless there is a strong reason to use one
>
> Your task is NOT to start coding immediately.
>
> Please follow this workflow:
>
> Phase 1: Competition research
> - Analyze the contest rules and constraints.
> - Identify technical limitations and opportunities.
> - Summarize key success factors.
> - Highlight anything that could disqualify an entry.
>
> Phase 2: Game concept refinement
> - Critically evaluate the Robo Rally idea.
> - Suggest alternative concepts if they have a higher chance of success.
> - Assess complexity versus available development time.
> - Estimate MVP scope.
> - Recommend the simplest version that can still be competitive.
>
> Phase 3: Technical architecture
> - Propose a lightweight architecture.
> - Recommend project structure.
> - Explain how assets, rendering, state management, levels, and persistence should work.
> - Justify whether Vanilla JS remains the best choice.
>
> Phase 4: Delivery plan
> - Break implementation into small incremental milestones.
> - Prioritize playable MVP first.
> - Define acceptance criteria for each milestone.
> - Identify the highest-risk areas.
>
> Phase 5: Development preparation
> - Produce a detailed implementation backlog.
> - Create an ordered task list suitable for Claude Code to execute step by step.
>
> Do not write any code yet.
>
> First perform the research, analysis, and planning phases and challenge my assumptions where appropriate. I want you to act as a senior game designer, software architect, and hackathon mentor reviewing the idea before any implementation begins.

### 2. 09:12 UTC

> Additional idea to evaluate:
>
> Variant A could include a hidden saboteur role inspired by Among Us.
>
> The theme could be:
> - One robot in the factory has a hardware/software glitch.
> - The glitched robot secretly works against the team objective.
> - Other robots do not know who the saboteur is.
> - The saboteur can introduce subtle disruptions:
>   - altering movement cards,
>   - rotating conveyor belts,
>   - causing temporary sensor failures,
>   - changing checkpoint orders,
>   - injecting bugs into the factory system.
>
> Please evaluate:
> - Whether a hidden-role mechanic improves the game.
> - Whether it fits a Robo Rally-inspired game.
> - Whether it remains feasible for a small competition project.
> - Whether it introduces too much complexity for an MVP.
> - How it could work in single-player, local multiplayer, and online multiplayer modes.
> - Whether there is a simpler implementation that preserves the same tension and social deduction aspect.
>
> Challenge the idea critically and compare:
> 1. Pure Robo Rally gameplay.
> 2. Robo Rally + hidden glitched robot.
> 3. Alternative Devoxx-themed concepts.
>
> Recommend the version that maximizes the chance of delivering a polished, fun, and competition-worthy game within limited development time.

### 3. 10:07 UTC

> Agree with A + Heisenbug. Suggest name for repo

### 4. 10:19 UTC

> Account is https://github.com/deii Create repo with gh - it's already logged in. Repo name: devoxx-belgium-2026-game

### 5. 10:30 UTC

> Shell restarted - gh on PATH. Go ahead with next step

### 6. 10:43 UTC

> Go ahead

### 7. 11:01 UTC

> Played by hand and fine. Agree with swap. Go ahead

### 8. 11:17 UTC

> Glitches are noticable - not frustrating. Go ahead

### 9. 11:31 UTC

> Go ahead

### 10. 12:16 UTC

> I'd like to add a little more fun. Would it be possible to style the robots after the conference speakers:
> Voxxy (Fast, light, weaves through the crowd, and carries an adapter) - Josh Long
> Droid (Has known the building for years, opens service doors, restores power, and lights the way) – Dr. Venkat Subramaniam
> Biggy (Heavy, unstoppable, pushes boxes and breaks down doors—but can’t climb stairs) – Victor Rentea

### 11. 12:23 UTC

> So let's make it a little more nuanced. Instead of personifying the robot, the robots could look up to these speakers as idols because of the abilities mentioned. For example, Voxxy could say “Bootiful” when he likes something.

### 12. 12:33 UTC

> Move boxes a bit lower so biggy can get a moment after the corner around wall.

### 13. 12:40 UTC

> Is it deployed on GitHub Page? It looks the same as before - boxes are close to Megacandy.

### 14. 12:43 UTC

> Hard refresh helped. Go ahead with elevator

### 15. 13:08 UTC

> It does not make sense that lift is working when electricity is off. Robots can start in basement.

### 16. 13:16 UTC

> Implement zoom in and out

### 17. 13:20 UTC

> Move service place downstairs. Now it's too frustrating to go there all the way with broken Biggy. It also makes sense to have it downstairs.

### 18. 13:24 UTC

> Improve robot drive sound - when going on full speed it sounds too much the same

### 19. 13:30 UTC

> Now add some frustration level. When coliding with solid walls or with robots, say somthing.

### 20. 13:59 UTC

> Another idea: add classic meme Elevator music from Kevin MacLeod when Biggy takes elevator.

### 21. 14:05 UTC

> Yes, make it a bit longer.

### 22. 14:08 UTC

> Add stage clear fanfare similar to Super Mario Bros. one.

### 23. 14:15 UTC

> On the initial screen with description overlay scrolling does not work well. Mouse scroll wheel zoom in and out.

### 24. 14:20 UTC

> On the title panel replace robots description with carousel - one slide for each robot with picture, description including an idol part.

### 25. 14:32 UTC

> What to improve now? Graphic is too simple, rooms are empty, robots animation simple. Maybe more people, or Karel Capek's "robot" easter egg?

### 26. 14:35 UTC

> Go ahead with your pick.

### 27. 14:53 UTC

> Improve backstage, service lift, electrical room, service door graphics.

### 28. 15:03 UTC

> Improve speaker lounge graphic.

### 29. 15:07 UTC

> Go ahead with people - no collision needed, just random lurking

### 30. 15:14 UTC

> Remove visual and audio hint when robot glitch happens - it's a bit annoying. Add sound when robots collide with somthing - wall, robot, box, .. Improve maintenance bay graphic.

### 31. 15:22 UTC

> Make graphic in left top corner showing selected robot more like in games. Portrait, name and number only - big when selected, smaller otherwise?

### 32. 15:27 UTC

> Make it a bit smaller. Can you do something with portrait background? It's too bright in darker game.

### 33. 15:31 UTC

> Polish code, check tests and performance, verify all requerements and goals from Devoxx website met.

### 34. 15:40 UTC

> Recreate README screenshots - graphic changed.

### 35. 15:44 UTC

> Publish a prompts log.
