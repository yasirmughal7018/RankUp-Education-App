SELECT au.id, au.display_name, au.username, l."name" AS Role, au.password_hash, au.must_change_password, au.is_active, aur.created_at AS RoleDate, 
	s."name" AS SchoolName, sc."name" AS CampusName, au.mobile_number , au.cnic, au.email 
FROM  app_users au
LEFT JOIN app_user_roles aur ON au.id = aur.user_id 
LEFT JOIN lookups l ON aur."role" = l.id AND l."type" = 'UserRole'
LEFT JOIN schools s ON au.school_id = s.id 
LEFT JOIN school_campuses sc ON au.campus_id  = sc.id 
ORDER BY id;

-- Registration queue rows (entity_type 2101 = User) in the generic app_approval table.
SELECT au.display_name , au.username, au2.display_name , au2.username, aua."approved_by_role", l."name" AS ApprovedBy, aua.approved_at, aua.is_approved, aua.request_id 
FROM app_approval aua 
LEFT JOIN app_users au ON aua.user_id = au.id 
INNER JOIN app_users au2 ON aua.approved_by_user_id  = au2.id 
INNER JOIN lookups l ON aua."approved_by_role" = l.id AND l."type" = 'UserRole'
LEFT JOIN lookups lu ON  aua.entity_type = lu.id  AND lu."type" = 'ApprovalEntityType'
LEFT JOIN app_user_school_change_request aucr ON aua.request_id = aucr.id 
ORDER BY aua.user_id;

-- Question workflow trail (entity_type 2102 = Question; request_id = question id).
SELECT q.id AS question_id, aua."action", au.display_name AS actor, l."name" AS actor_role, aua.reason, aua.created_at
FROM app_approval aua
INNER JOIN questions q ON aua.request_id = q.id
INNER JOIN app_users au ON aua.approved_by_user_id = au.id
INNER JOIN lookups l ON aua."approved_by_role" = l.id AND l."type" = 'UserRole'
WHERE aua.entity_type = 2102
ORDER BY aua.request_id, aua.created_at;

/*
INSERT INTO public.app_users
(id, username, display_name, password_hash, is_active, created_date, modified_date, email, last_login_at, requested_at, mobile_number, cnic, school_id, campus_id, must_change_password, reason_message, roll_number_teacher_code)
OVERRIDING SYSTEM VALUE 
VALUES(10, 'aesadmin', 'AES Admin', 'password', true, '2026-07-11', NULL, NULL, NULL, NULL, '1', NULL, 1, NULL, false, NULL, NULL);

INSERT INTO public.app_users
(id, username, display_name, password_hash, is_active, created_date, modified_date, email, last_login_at, requested_at, mobile_number, cnic, school_id, campus_id, must_change_password, reason_message, roll_number_teacher_code)
OVERRIDING SYSTEM VALUE 
VALUES(11, 'aes1', 'AES01 Campus Admin', 'password', true, '2026-07-11', NULL, NULL, NULL, NULL, '030000112', NULL, 1, 1, false, NULL, NULL);


INSERT INTO public.app_user_roles
(user_id, "role", created_at)
OVERRIDING SYSTEM VALUE 
VALUES(1, 2010, '2026-07-12 22:43:50.098');

INSERT INTO public.app_user_roles
(user_id, "role", created_at)
OVERRIDING SYSTEM VALUE 
VALUES(2, 2011, '2026-07-12 22:43:50.098');

INSERT INTO public.app_user_roles
(user_id, "role", created_at)
OVERRIDING SYSTEM VALUE 
VALUES(3, 2012, '2026-07-12 22:43:50.098');

INSERT INTO public.app_user_roles
(user_id, "role", created_at)
OVERRIDING SYSTEM VALUE 
VALUES(4, 2012, '2026-07-12 22:43:50.098');



INSERT INTO public.app_user_roles
(user_id, "role", created_at)
OVERRIDING SYSTEM VALUE 
VALUES(10, 2011, '2026-07-12 22:43:50.098');

INSERT INTO public.app_user_roles
(user_id, "role", created_at)
OVERRIDING SYSTEM VALUE 
VALUES(11, 2012, '2026-07-12 22:43:50.098');
**/

