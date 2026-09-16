# CampusAdmin students directory filters

On `/admin/directory/students`:

1. **CampusAdmin** — do not show School or Campus filter dropdowns (scope is locked to their school/campus).
2. **Grade** — use a Class lookup dropdown (“All grades” + named grades), not a free-text number input.
3. **Create / Edit student dialog** — CampusAdmin: hide School and Campus fields; submit uses the signed-in admin’s schoolId + campusId. SchoolAdmin: hide School only (campus still selectable). Grade is a Class lookup dropdown for all roles.

Same visibility pattern as the teachers directory: PortalAdmin sees School; PortalAdmin/SchoolAdmin see Campus; CampusAdmin sees neither.
