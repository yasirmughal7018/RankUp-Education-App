"""Generate RankUp Education Authentication & Login Logic DOCX documentation."""

from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION_START
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

DOCS_DIR = Path(__file__).resolve().parent
OUTPUT = DOCS_DIR / "RankUp_Authentication_Logic.docx"


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=80, bottom=80, start=120, end=120):
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for margin_name, value in (("top", top), ("bottom", bottom), ("start", start), ("end", end)):
        node = tc_mar.find(qn(f"w:{margin_name}"))
        if node is None:
            node = OxmlElement(f"w:{margin_name}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_table_geometry(table, widths_dxa):
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.autofit = False
    tbl = table._tbl
    tbl_pr = tbl.tblPr
    tbl_w = tbl_pr.find(qn("w:tblW"))
    if tbl_w is None:
        tbl_w = OxmlElement("w:tblW")
        tbl_pr.append(tbl_w)
    tbl_w.set(qn("w:type"), "dxa")
    tbl_w.set(qn("w:w"), str(sum(widths_dxa)))
    tbl_grid = tbl.tblGrid
    if tbl_grid is None:
        tbl_grid = OxmlElement("w:tblGrid")
        tbl.insert(0, tbl_grid)
    for child in list(tbl_grid):
        tbl_grid.remove(child)
    for width in widths_dxa:
        grid_col = OxmlElement("w:gridCol")
        grid_col.set(qn("w:w"), str(width))
        tbl_grid.append(grid_col)
    for row in table.rows:
        for idx, cell in enumerate(row.cells):
            width = widths_dxa[idx]
            cell.width = Inches(width / 1440)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            set_cell_margins(cell)
            tc_pr = cell._tc.get_or_add_tcPr()
            tc_w = tc_pr.find(qn("w:tcW"))
            if tc_w is None:
                tc_w = OxmlElement("w:tcW")
                tc_pr.append(tc_w)
            tc_w.set(qn("w:type"), "dxa")
            tc_w.set(qn("w:w"), str(width))


def set_table_borders(table, color="B7C6D8"):
    tbl_pr = table._tbl.tblPr
    borders = tbl_pr.find(qn("w:tblBorders"))
    if borders is None:
        borders = OxmlElement("w:tblBorders")
        tbl_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "6")
        element.set(qn("w:space"), "0")
        element.set(qn("w:color"), color)


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.375)
    p.paragraph_format.first_line_indent = Inches(-0.188)
    p.paragraph_format.space_after = Pt(4)
    p.add_run(text)


def add_table(doc, headers, rows, widths_dxa):
    table = doc.add_table(rows=1, cols=len(headers))
    set_table_geometry(table, widths_dxa)
    set_table_borders(table)
    for idx, header in enumerate(headers):
        set_cell_shading(table.rows[0].cells[idx], "E8EEF5")
        p = table.rows[0].cells[idx].paragraphs[0]
        run = p.add_run(header)
        run.bold = True
        run.font.color.rgb = RGBColor(22, 57, 87)
    for row_data in rows:
        cells = table.add_row().cells
        for idx, value in enumerate(row_data):
            cells[idx].paragraphs[0].add_run(value)
    doc.add_paragraph()


def add_note(doc, label, text, fill="F4F6F9"):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9360])
    set_table_borders(table)
    cell = table.cell(0, 0)
    set_cell_shading(cell, fill)
    p = cell.paragraphs[0]
    r = p.add_run(f"{label}: ")
    r.bold = True
    p.add_run(text)
    doc.add_paragraph()


def add_code(doc, text):
    table = doc.add_table(rows=1, cols=1)
    set_table_geometry(table, [9360])
    set_table_borders(table, "2F3A4A")
    cell = table.cell(0, 0)
    set_cell_shading(cell, "172033")
    run = cell.paragraphs[0].add_run(text)
    run.font.name = "Consolas"
    run.font.size = Pt(9)
    run.font.color.rgb = RGBColor(248, 250, 252)
    doc.add_paragraph()


def set_document_styles(doc):
    section = doc.sections[0]
    section.start_type = WD_SECTION_START.NEW_PAGE
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    title = doc.styles["Title"]
    title.font.name = "Calibri"
    title.font.size = Pt(26)
    title.font.bold = True
    title.font.color.rgb = RGBColor(23, 50, 77)
    subtitle = doc.styles["Subtitle"]
    subtitle.font.name = "Calibri"
    subtitle.font.size = Pt(12)
    subtitle.font.color.rgb = RGBColor(91, 100, 114)
    for level, size in ((1, 16), (2, 13), (3, 12)):
        h = doc.styles[f"Heading {level}"]
        h.font.name = "Calibri"
        h.font.size = Pt(size)
        h.font.color.rgb = RGBColor(46, 116, 181)
        h.font.bold = True


def build_doc():
    doc = Document()
    set_document_styles(doc)

    doc.add_paragraph("RankUp Education — Authentication & Login Logic", style="Title")
    doc.add_paragraph(
        "Web API, React portal, Flutter mobile — username rules, login identifiers, "
        "registration approval, must-change-password, and notifications.",
        style="Subtitle",
    )

    add_table(
        doc,
        ["Prepared for", "Scope", "Auth model"],
        [[
            "RankUp Education workspace",
            "WebApi + React + Flutter Mobile",
            "JWT access token + hashed refresh token",
        ]],
        [2200, 3200, 3960],
    )

    doc.add_heading("1. Executive Summary", level=1)
    for item in [
        "All authenticated API calls use a Bearer JWT access token.",
        "Login accepts CNIC or mobile number (also matches stored username). Only is_active=true with a non-null password_hash may sign in.",
        "Username priority: CNIC if provided, otherwise mobile. When CNIC is set, username becomes CNIC.",
        "Registration creates an inactive app_users row with identity fields persisted. Approval activates, sets password, forces password change, and creates a slim role profile.",
        "admin_target School Admin → School Admin + Portal Admin can approve; Portal Admin → Portal Admin only. Eligible admins get in-app notifications.",
        "must_change_password: true = must change; null/false = no force; after user changes password once → false.",
        "Five roles: SuperAdmin (Portal Admin), SchoolAdmin, Teacher, Student, Parent.",
    ]:
        add_bullet(doc, item)

    add_note(
        doc,
        "Current model",
        "Registration fields are persisted on app_users. School/campus/CNIC/roll/teacher code live on app_users; "
        "profile tables keep role-specific fields only (e.g. student grade/section).",
        "EEF8F1",
    )

    doc.add_heading("2. Username & Login Rules", level=1)
    doc.add_heading("2.1 Username priority", level=2)
    for item in [
        "If CNIC is provided → username = CNIC (and cnic column is set).",
        "If CNIC is absent → username = mobile_number.",
        "On approval, if CNIC is set/updated → username is updated to CNIC when needed.",
    ]:
        add_bullet(doc, item)

    doc.add_heading("2.2 Login identifiers", level=2)
    add_code(
        doc,
        "GetByLoginIdentifierAsync(identifier):\n"
        "  1. Match app_users.username\n"
        "  2. Else match app_users.cnic\n"
        "  3. Else match app_users.mobile_number\n"
        "Clients send the identifier in the username JSON field.",
    )

    doc.add_heading("2.3 must_change_password", level=2)
    add_table(
        doc,
        ["Value", "Meaning"],
        [
            ["null or false", "No forced password change"],
            ["true", "User must change password (set on admin approval)"],
            ["After change-password", "Set to false"],
        ],
        [2800, 6560],
    )

    doc.add_heading("3. Admin Target & Approval Routing", level=1)
    add_table(
        doc,
        ["admin_target", "When set", "Who can approve", "Who is notified"],
        [
            [
                "School Admin",
                "School selected",
                "School Admin (same school) + Portal Admin",
                "Matching School Admins + SuperAdmins",
            ],
            [
                "Portal Admin",
                "No school selected",
                "Portal Admin (SuperAdmin) only",
                "SuperAdmins only",
            ],
        ],
        [1800, 1800, 3000, 2760],
    )
    add_bullet(doc, "Notifications use app_notifications with category RegistrationRequest.")

    doc.add_heading("4. Database Model — app_users", level=1)
    add_table(
        doc,
        ["Column", "Type", "Purpose"],
        [
            ["username", "VARCHAR(50)", "CNIC if present, else mobile"],
            ["mobile_number", "VARCHAR(40)", "Contact + alternate login id"],
            ["cnic", "VARCHAR(20)", "Unique when set; preferred username"],
            ["school_id / campus_id", "INTEGER NULL", "Scope owned on user"],
            ["must_change_password", "BOOLEAN NULL", "true = force; null/false = no force"],
            ["admin_target", "VARCHAR(80)", "School Admin | Portal Admin"],
            ["roll_number_teacher_code", "VARCHAR(80)", "Student roll or teacher code"],
            ["reason_message / email", "VARCHAR", "Optional registration fields"],
            ["password_hash", "TEXT NULL", "NULL while pending"],
            ["is_active / requested_at", "bool / timestamptz", "Pending vs active gate"],
        ],
        [2600, 1800, 4960],
    )

    add_code(doc, "Pending: is_active = false AND password_hash IS NULL\nActive:   is_active = true  AND password_hash IS NOT NULL")

    doc.add_heading("4.1 Slim profile tables", level=2)
    add_table(
        doc,
        ["Table", "Keeps", "Moved to app_users"],
        [
            ["app_user_students", "grade, section, mobile", "school_id, campus_id, cnic, roll"],
            ["app_user_teachers", "mobile", "school_id, campus_id, cnic, teacher_code"],
            ["app_user_parents", "mobile", "cnic"],
        ],
        [2400, 2800, 4160],
    )

    doc.add_heading("5. API Endpoints", level=1)
    add_table(
        doc,
        ["Method", "Route", "Auth", "Description"],
        [
            ["POST", "/api/auth/login", "Anonymous", "CNIC or mobile + password"],
            ["POST", "/api/auth/register", "Anonymous", "Pending user + notify admins"],
            ["GET", "/api/auth/registration-options/schools", "Anonymous", "School dropdown"],
            ["GET", "/api/auth/registration-options/schools/{id}/campuses", "Anonymous", "Campus dropdown"],
            ["GET", "/api/auth/registrations/pending", "Admin", "List pending (scoped)"],
            ["POST", "/api/auth/registrations/{id}/approve", "Admin", "Activate + force password change"],
            ["POST", "/api/auth/registrations/{id}/reject", "Admin", "Delete pending request"],
            ["POST", "/api/auth/change-password", "JWT", "Clears must_change_password"],
            ["POST", "/api/auth/token/refresh", "Anonymous", "Refresh access token"],
            ["POST", "/api/auth/logout", "Anonymous", "Revoke refresh token"],
            ["GET", "/api/auth/me", "JWT", "Current user profile"],
            ["POST", "/api/auth/password-reset/request", "Anonymous", "Admin-mediated reset"],
        ],
        [900, 3600, 1200, 3660],
    )

    doc.add_heading("6. Registration Flow", level=1)
    add_code(
        doc,
        "Client → POST /api/auth/register\n"
        "  → username = CNIC ?? mobile\n"
        "  → admin_target = schoolId ? School Admin : Portal Admin\n"
        "  → INSERT pending app_users\n"
        "  → notify eligible admins (RegistrationRequest)\n\n"
        "Admin → POST /api/auth/registrations/{id}/approve\n"
        "  → enforce admin_target rules\n"
        "  → if CNIC set → username = CNIC\n"
        "  → INSERT slim profile\n"
        "  → Activate + RequirePasswordChange (true)",
    )

    doc.add_heading("6.1 Approve payload by role", level=2)
    add_table(
        doc,
        ["Role", "Required fields on approve"],
        [
            ["Student", "password, schoolId, campusId, grade, studentRollNumber"],
            ["Teacher", "password, schoolId, campusId, teacherCode"],
            ["Parent", "password (optional cnic / mobile)"],
        ],
        [1800, 7560],
    )

    doc.add_heading("7. Login Flow", level=1)
    add_code(
        doc,
        "Client → POST /api/auth/login { username: CNIC|mobile, password }\n"
        "  1. GetByLoginIdentifierAsync()\n"
        "  2. Attach profile context\n"
        "  3. EnsureCanLogin()\n"
        "  4. PasswordHasher.Verify()\n"
        "  5. IssueRefreshToken + CreateAccessToken\n"
        "  → LoginResponse includes mustChangePassword",
    )

    doc.add_heading("8. JWT Claims", level=1)
    add_table(
        doc,
        ["Claim", "Source"],
        [
            ["sub / userId", "app_users.id"],
            ["name", "app_users.username"],
            ["role", "UserRole enum"],
            ["permissions", "AuthPermissions.ForRole()"],
            ["profileId", "Profile table id"],
            ["schoolId / campusId", "app_users.school_id / campus_id"],
        ],
        [2800, 6560],
    )
    add_bullet(doc, "mustChangePassword is returned on login/me/change-password responses, not as a JWT claim.")

    doc.add_heading("9. Security", level=1)
    for item in [
        "Passwords: PBKDF2-SHA256, 100,000 iterations.",
        "Refresh tokens stored as SHA-256 hex only.",
        "Login rate limit: 8 requests per 60 seconds.",
        "Password reset does not reveal whether the identifier exists.",
        "JWT signing key configured in appsettings.json → Jwt:SigningKey.",
    ]:
        add_bullet(doc, item)

    doc.add_heading("10. Configuration", level=1)
    add_table(
        doc,
        ["Setting", "Location", "Notes"],
        [
            ["JWT issuer / audience / key", "appsettings.json → Jwt", "AccessTokenMinutes default 30"],
            ["Database", "ConnectionStrings:DefaultConnection", "PostgreSQL"],
            ["Schema support", "Database:EnsureApiSupportTables", "Auto-applies on startup"],
            ["Mobile mocks", "USE_MOCKS=true", "Uses MockAuthRepository"],
        ],
        [2800, 3200, 3360],
    )

    doc.add_heading("11. Related Source Files", level=1)
    add_table(
        doc,
        ["Area", "File"],
        [
            ["API controller", "WebApi/src/RankUpEducation.Api/Controllers/AuthController.cs"],
            ["Business logic", "WebApi/src/RankUpEducation.Application/Auth/AuthService.cs"],
            ["User repository", "WebApi/src/RankUpEducation.Infrastructure/Persistence/Repositories/UserRepository.cs"],
            ["Schema initializer", "WebApi/src/RankUpEducation.Infrastructure/Persistence/ApiSupportSchemaInitializer.cs"],
            ["Baseline SQL", "docs/RankUpEducatoin_sql.sql"],
            ["HTML / DOCX / builder", "docs/RankUp_Authentication_Logic.html|.docx|.py"],
            ["React auth", "React/src/features/authentication/"],
            ["Mobile login", "Mobile/lib/features/authentication/presentation/pages/login_page.dart"],
        ],
        [2400, 6960],
    )

    add_note(
        doc,
        "Version",
        "Aligned with current application logic (Jul 2026): CNIC/mobile username & login, "
        "persisted registration identity, slim profiles, admin_target routing, must_change_password, "
        "and in-app registration notifications.",
    )

    doc.core_properties.title = "RankUp Education — Authentication & Login Logic"
    doc.core_properties.subject = "Authentication, login, registration, JWT, admin target, must-change-password"
    doc.save(OUTPUT)


if __name__ == "__main__":
    build_doc()
