# Assign quiz: one Grade control for all-in-grade / all-in-section

On Assign quiz (`/quizzes/:id` → Assign):

For SchoolAdmin / CampusAdmin / PortalAdmin, Audience filters already includes an optional Grade. Modes **All in Grade** and **All in section / class** also render a required Grade (and Section). That showed **two Grade dropdowns**.

## Fix

When mode is `allingrade` or `allinsection`, hide the Audience-filters Grade. Keep the single required Grade (and Section for all-in-section) below.

## CampusAdmin School / Campus

CampusAdmin does not see School or Campus in Assign quiz — placement uses the signed-in school/campus. PortalAdmin keeps School; SchoolAdmin keeps Campus. Audience filters panel is omitted when nothing remains to show (e.g. CampusAdmin + all-in-grade).
