# OS design study

Ryan's verdict on the shipped Today page: it is hard to understand, and it has barely any context. Every row is a monogram, a cut-off line, and five or six identical grey buttons, plus an empty note box. He cannot tell what an item is, or what a click will do.

This document is the research for a redesign. It does not add behavior. The preview pages that follow are mockups. Their buttons do not send, save, or snooze.

Two references he asked us to apply literally:

Forbes, seven aspects of a good interface: empathy and a beginner's mind, simplicity and color, brand consistency, research, one organized screen, balance of function with usability and style, and UX before decoration.

Forcoda, five elements: size and placement so one action is obvious, alignment, an architecture of attention, familiar patterns, and easy to learn (about five to nine things on screen, in groups).

## What failed

The page treated Ryan like someone who already knows packet ids, file paths, owner keys, and which of six identical buttons is the real one.

- Beginner's mind failed. "Approve card / , blockers /." is an internal path, not a sentence.
- One primary action failed. Send, Hold, Edit, Tomorrow, and Next week have the same weight.
- Familiar patterns failed. A decision is closer to approving a text message than to operating a toolbar.
- Color failed. Dark background, grey type, and grey buttons give nothing to look at first.
- Chunking failed. Decisions and pitches sit in one stack, so a company to review looks like a message to send.

## Products

### Linear: inbox and triage

Sources: [Linear changelog, split inbox](https://linear.app/changelog/2021-12-02-workspace-templates), [Triage docs](https://linear.app/docs/triage).

Patterns worth copying:

1. The inbox is two panes, like mail. The list keeps your place. The focus pane is where you read and act. You do not jump to another screen and lose the queue.
2. Triage has a few named outcomes, each with one shortcut: accept (`1`), decline (`2`), duplicate (`3`), snooze (`H`). The verbs say what happens to the item.
3. Snooze is a way to hide something until a time you pick, not a button that sits beside the real decision on every row.

Why it fits: Ryan's queue is a triage inbox. The list should say who and why. The open item should say what will happen.

### Superhuman: one decision, then the next

Sources: [Inbox Zero](https://help.superhuman.com/hc/en-us/articles/46005833597709-Achieve-Inbox-Zero), [Split Inbox](https://help.superhuman.com/hc/en-us/articles/46005619081101-Default-Split-Inbox), [Shortcuts](https://help.superhuman.com/hc/en-us/articles/46005789591693-Speed-Up-With-Shortcuts).

Patterns worth copying:

1. Open the top item, decide, and the next item comes to you. The question is simple: today, another day, or done (`J`, `H`, `E`).
2. Split the inbox into a few piles (they suggest staying under about seven). Person mail is not mixed with newsletters.
3. If you do not know a shortcut, Cmd-K tells you. The shortcut is a faster path to a button you can already see. It is not the only way.

Why it fits: a reply Ryan must approve is one message, shown in full, with one send. Deals are a different pile.

### Attio and Folk: the person record

Sources: [Attio record page, 2026](https://attio.com/changelog/2026/record-page-redesign), [Attio record anatomy](https://attio.com/help/reference/attio-101/attios-data-model/understanding-records), [Folk contact profile](https://help.folk.app/en/articles/5007276-contact-profile).

Patterns worth copying:

1. Attio puts the name, the key facts, and the actions at the top left. Attributes sit on the left, where the eye lands. The timeline is the rest of the page, with noisy automation collapsed.
2. Highlights are a short row of facts (they cap the widgets), not every field.
3. Folk opens the person beside the list, or full width if you want room. Details, interactions, notes, and reminders are separate. Empty sections are not fake forms. Quick actions are a few verbs at the top (email, call), and everything else is in the menu.

Why it fits: a person page should answer who they are and what happened with them. It should not open as a stack of empty inputs.

### Things 3 and Height: a calm list

Patterns worth copying:

1. Things 3 makes Today a short list under plain headings. The row is a sentence. The only control on the row is the checkbox. Notes appear when you open the item. There is no per-row toolbar.
2. Height keeps a row to one line: a mark, a name, a person, a date. Status is a small chip, not a button. The record opens beside the list.
3. Both use space and type size to show what matters. Metadata is quieter than the title.

Why it fits: six equal buttons on a row is the opposite of these lists. Secondary facts can wait until the item is open.

### Stripe dashboard: a number with a sentence

Patterns worth copying:

1. A figure is never alone. "Gross volume" sits with the number, the comparison, and the period. The label is a phrase, not a code.
2. The page has one primary action. Everything else is a link or a quiet menu.
3. Alignment is strict: labels, values, and actions share a few vertical lines. You can scan down one edge.

Why it fits: "2" with no sentence is not a status. "2 decisions are waiting on you" is.

### Gather, Habbo, and Stardew: one room

Patterns worth copying:

1. You stand in one room. You do not see the whole building as six tiny slabs. A door, an elevator, or a floor list changes rooms.
2. People are large enough to have a name over their head. You click a person. Habbo gives you a small menu. Stardew gives you a dialogue box at the bottom with their name and one line of what they are doing.
3. The floor reads as a place: walls, a rug, desks. The art is simple and consistent. Movement is optional. The point is that you can tell who is where.

Why it fits: the isometric stack made every robot a speck. The next office should be one floor at a time, with a name and a sentence when you click someone.

## Principles for this OS

1. Beginner's mind. If a phrase needs a packet id, a file path, or an owner key, it does not appear. Ryan should understand an item with no briefing.
2. Four questions on every decision. Who is this (name, firm, logo, one line on who they are). What they asked or what happened. What you will do if he approves, shown as the real message when there is one. Why it is in front of him.
3. One primary button. The label is the outcome: "Send this reply" or "Approve this pack". Edit is the second button, and only when there is a message to edit. Snooze and skip live in a more menu.
4. Do not show an empty box. A note field appears when he asks to add a note, not on every card.
5. Decisions and deals are different piles. A pitch does not get send buttons. A deal shows one sentence on why it matters and the facts we actually have.
6. Counts are sentences. "2 decisions are waiting on you." The number is large. The label is next to it, in the same breath.
7. Five to nine things, in groups. A decision group. A deals group. Not a single mixed list.
8. Familiar shapes. A message looks like a message. A person looks like a contact. A floor looks like a room. An overflow menu looks like "...".
9. Type does the hierarchy. The name is the largest text. The why is a normal sentence. Buttons are sentence case. Display type is for the wordmark and the big counts, not for body text.
10. Color stays inside the brand: black `#000`, cream `#f0ede8`, white `#fff`, accent `#123D22`. The default mockup is cream paper with black text, because grey on black was hard to read. A black theme is one toggle, not a second design. The accent is the primary button, used once per item.
11. UX before chrome. Alignment, a single reading column, and a clear first action beat another control.

## What the mockups show

- Today: the count line, two decisions that answer the four questions, then deals to review as a separate group.
- A decision on its own page: the same card, with the message large enough to read as the thing he is approving, and a quiet hint for next and previous.
- CRM: a short list, then a person record with who they are, the next step, and what happened. No empty form.
- Bots: one room, nameplates, a floor switch, and a bottom line when you click a robot.

These pages read the live snapshot when it has decisions, deals, or people. A missing field is left off the screen. The preview sample uses only names and facts already on that queue: Kathleen Collins, the October partner pack, and the companies that were in review. It does not add a job, a firm, a date, or the rest of a message. Nothing on these pages writes to the action queue.
