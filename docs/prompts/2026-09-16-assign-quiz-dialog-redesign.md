# Redesign Assign quiz dialog

Restyle Assign quiz popup to match the shared app Dialog theme (same family as confirm / grant-role dialogs):

- Radix `Dialog` shell with themed overlay and close control
- Header with icon, title, short description
- Scrollable body with clear **Audience** and **Schedule** sections (no cramped nested panels)
- Sticky footer with outline Cancel + primary Assign
- Theme tokens (`border-border`, `bg-card`, `text-foreground`) instead of one-off slate/status CSS clutter

Behavior unchanged (modes, CampusAdmin locked school/campus, single grade for all-in-grade/section, student picker).
