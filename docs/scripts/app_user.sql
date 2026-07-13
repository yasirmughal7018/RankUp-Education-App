SELECT au.id, au.display_name, au.username, l."name", au.password_hash, au.must_change_password, au.is_active, aur.created_at AS RoleDate, 
	s."name" AS SchoolName, sc."name" AS CampusName
FROM  app_users au
LEFT JOIN app_user_roles aur ON au.id = aur.user_id 
LEFT JOIN lookups l ON aur."role" = l.id AND l."type" = 'UserRole'
LEFT JOIN schools s ON au.school_id = s.id 
LEFT JOIN school_campuses sc ON au.campus_id  = sc.id 
ORDER BY id;

SELECT au.display_name , au.username, au2.display_name , au2.username, l."name" AS ROLE, aua.approved_at 
FROM app_user_approval aua 
INNER JOIN app_users au ON aua.user_id = au.id 
INNER JOIN app_users au2 ON aua.approved_by_user_id  = au2.id 
INNER JOIN lookups l ON aua."approved_by_role" = l.id AND l."type" = 'UserRole'

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
VALUES(10, 2011, '2026-07-12 22:43:50.098');

INSERT INTO public.app_user_roles
(user_id, "role", created_at)
VALUES(11, 2012, '2026-07-12 22:43:50.098');

**/