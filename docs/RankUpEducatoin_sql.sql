-- public.app_users definition

-- Drop table

-- DROP TABLE public.app_users;

CREATE TABLE public.app_users (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	username varchar(50) NOT NULL,
	display_name varchar(50) NULL,
	"role" int2 NOT NULL,
	password_hash text NULL,
	is_active bool DEFAULT false NOT NULL,
	created_date date DEFAULT CURRENT_DATE NULL,
	modified_date date NULL,
	email varchar(200) NULL,
	last_login_at timestamptz NULL,
	requested_at timestamptz NULL,
	mobile_number varchar(40) NULL,
	cnic varchar(20) NULL,
	school_id int4 NULL,
	campus_id int4 NULL,
	must_change_password bool NULL,
	reason_message varchar(1000) NULL,
	admin_target varchar(80) NULL,
	roll_number_teacher_code varchar(80) NULL,
	CONSTRAINT app_users_id_role_key UNIQUE (id, role),
	CONSTRAINT app_users_pkey PRIMARY KEY (id),
	CONSTRAINT app_users_username_key UNIQUE (username),
	CONSTRAINT app_users_role_fkey FOREIGN KEY (role) REFERENCES public.lookups(id),
	CONSTRAINT chk_app_users_password_when_active CHECK (((is_active = false) OR (password_hash IS NOT NULL) OR (must_change_password IS TRUE))),
	CONSTRAINT chk_app_users_role CHECK ((role = ANY (ARRAY[2010, 2011, 2012, 2013, 2014, 2015]::int2[])))
);
CREATE UNIQUE INDEX ix_app_users_email ON public.app_users USING btree (email) WHERE (email IS NOT NULL);
CREATE UNIQUE INDEX ix_app_users_cnic_unique ON public.app_users USING btree (cnic) WHERE (cnic IS NOT NULL);
CREATE INDEX ix_app_users_pending_registration ON public.app_users USING btree (requested_at DESC NULLS LAST) WHERE (is_active = false);


-- public.schools definition

-- Drop table

-- DROP TABLE public.schools;

CREATE TABLE public.schools (
	id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	"name" varchar(200) NOT NULL,
	code varchar(100) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_date date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT schools_code_key UNIQUE (code),
	CONSTRAINT schools_pkey PRIMARY KEY (id)
);


-- public.app_user_parents definition

-- Drop table

-- DROP TABLE public.app_user_parents;

CREATE TABLE public.app_user_parents (
	parent_id int8 NOT NULL,
	modified_date timestamptz DEFAULT now() NOT NULL,
	mobile_number varchar(40) NULL,
	CONSTRAINT app_user_parents_pkey PRIMARY KEY (parent_id),
	CONSTRAINT app_user_parents_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.app_users(id)
);


-- public.device_sessions definition

-- Drop table

-- DROP TABLE public.device_sessions;

CREATE TABLE public.device_sessions (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	user_id int8 NOT NULL,
	device_id varchar(180) NOT NULL,
	platform varchar(40) NULL,
	push_token varchar(512) NULL,
	app_version varchar(40) NULL,
	last_seen_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT device_sessions_pkey PRIMARY KEY (id),
	CONSTRAINT device_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX ix_device_sessions_user_id_device_id ON public.device_sessions USING btree (user_id, device_id);


-- public.lookups definition

-- Drop table

-- DROP TABLE public.lookups;

CREATE TABLE public.lookups (
	id int2 NOT NULL,
	"name" varchar(100) NOT NULL,
	"type" varchar(100) NOT NULL,
	order_by int2 DEFAULT 0 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	lookup_ref_id int2 NULL,
	CONSTRAINT lookups_pkey PRIMARY KEY (id),
	CONSTRAINT lookups_lookup_ref_id_fkey FOREIGN KEY (lookup_ref_id) REFERENCES public.lookups(id)
);


-- public.questions definition

-- Drop table

-- DROP TABLE public.questions;

CREATE TABLE public.questions (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	question_text varchar(1000) NOT NULL,
	question_type_id int2 NOT NULL,
	class_id int2 NOT NULL,
	subject_id int2 NOT NULL,
	topic_id int2 NULL,
	difficulty_level int2 NOT NULL,
	explanation varchar(1000) NULL,
	hint varchar(1000) NULL,
	estimated_time_seconds int2 NOT NULL,
	marks int2 NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	status_id int2 NOT NULL,
	created_by varchar(100) NOT NULL,
	approved_by varchar(100) NULL,
	created_date date DEFAULT CURRENT_DATE NOT NULL,
	modified_date date DEFAULT CURRENT_DATE NOT NULL,
	is_ai_approved bool DEFAULT false NOT NULL,
	CONSTRAINT questions_pkey PRIMARY KEY (id),
	CONSTRAINT questions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.lookups(id),
	CONSTRAINT questions_difficulty_level_fkey FOREIGN KEY (difficulty_level) REFERENCES public.lookups(id),
	CONSTRAINT questions_question_type_id_fkey FOREIGN KEY (question_type_id) REFERENCES public.lookups(id),
	CONSTRAINT questions_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.lookups(id),
	CONSTRAINT questions_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.lookups(id),
	CONSTRAINT questions_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.lookups(id)
);
CREATE INDEX idx_questions_lookup_ids ON public.questions USING btree (class_id, subject_id, topic_id);


-- public.refresh_tokens definition

-- Drop table

-- DROP TABLE public.refresh_tokens;

CREATE TABLE public.refresh_tokens (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	user_id int8 NOT NULL,
	token_hash varchar(128) NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	expires_at timestamptz NOT NULL,
	revoked_at timestamptz NULL,
	CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
	CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX ix_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);
CREATE INDEX ix_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


-- public.school_campuses definition

-- Drop table

-- DROP TABLE public.school_campuses;

CREATE TABLE public.school_campuses (
	id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	school_id int4 NOT NULL,
	"name" varchar(200) NOT NULL,
	address varchar(300) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	created_date date DEFAULT CURRENT_DATE NOT NULL,
	modified_date date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT school_campuses_pkey PRIMARY KEY (id),
	CONSTRAINT school_campuses_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);


-- public.student_groups definition

-- Drop table

-- DROP TABLE public.student_groups;

CREATE TABLE public.student_groups (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	referral_id int8 NOT NULL,
	group_name varchar(50) NOT NULL,
	description varchar(200) NOT NULL,
	is_teacher_group bool DEFAULT true NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_date date DEFAULT CURRENT_DATE NOT NULL,
	updated_date date DEFAULT CURRENT_DATE NOT NULL,
	creator_role int2 NULL,
	CONSTRAINT chk_creator_role_type CHECK ((creator_role IS NULL OR (creator_role = ANY (ARRAY[2013, 2014]::int2[])))),
	CONSTRAINT student_groups_pkey PRIMARY KEY (id),
	CONSTRAINT student_groups_refral_id_and_role_fkey FOREIGN KEY (referral_id,creator_role) REFERENCES public.app_users(id,"role")
);


-- public.app_user_students definition

-- Drop table

-- DROP TABLE public.app_user_students;

CREATE TABLE public.app_user_students (
	student_id int8 NOT NULL,
	grade int2 NOT NULL,
	"section" text NOT NULL,
	modified_date timestamptz DEFAULT now() NOT NULL,
	mobile_number varchar(40) NULL,
	CONSTRAINT app_user_students_pkey PRIMARY KEY (student_id),
	CONSTRAINT app_user_students_grade_fkey FOREIGN KEY (grade) REFERENCES public.lookups(id),
	CONSTRAINT app_user_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.app_users(id)
);


-- public.app_user_teachers definition

-- Drop table

-- DROP TABLE public.app_user_teachers;

CREATE TABLE public.app_user_teachers (
	teacher_id int8 NOT NULL,
	modified_date timestamptz DEFAULT now() NOT NULL,
	mobile_number varchar(40) NULL,
	CONSTRAINT app_user_teachers_pkey PRIMARY KEY (teacher_id),
	CONSTRAINT app_user_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.app_users(id)
);


-- public.parent_student_relations definition

-- Drop table

-- DROP TABLE public.parent_student_relations;

CREATE TABLE public.parent_student_relations (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	parent_id int8 NOT NULL,
	student_id int8 NOT NULL,
	relationship varchar(50) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_date date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT parent_student_relations_parent_student_key UNIQUE (parent_id, student_id),
	CONSTRAINT parent_student_relations_pkey PRIMARY KEY (id),
	CONSTRAINT parent_student_relations_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.app_user_parents(parent_id),
	CONSTRAINT parent_student_relations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.app_user_students(student_id)
);


-- public.question_accepted_answers definition

-- Drop table

-- DROP TABLE public.question_accepted_answers;

CREATE TABLE public.question_accepted_answers (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	question_id int8 NOT NULL,
	answer_text varchar(1000) NOT NULL,
	is_case_sensitive bool DEFAULT false NOT NULL,
	allow_partial_match bool DEFAULT false NOT NULL,
	normalized_answer varchar(1000) NOT NULL,
	minimum_length int2 DEFAULT 0 NOT NULL,
	maximum_length int2 DEFAULT 1000 NOT NULL,
	ai_review varchar(1000) NULL,
	teacher_review varchar(1000) NULL,
	CONSTRAINT question_accepted_answers_pkey PRIMARY KEY (id),
	CONSTRAINT question_accepted_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);


-- public.question_options definition

-- Drop table

-- DROP TABLE public.question_options;

CREATE TABLE public.question_options (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	question_id int8 NOT NULL,
	option_text varchar(1000) NOT NULL,
	option_image_url varchar(512) NULL,
	is_correct bool NOT NULL,
	explanation varchar(1000) NULL,
	is_active bool DEFAULT true NOT NULL,
	CONSTRAINT question_options_pkey PRIMARY KEY (id),
	CONSTRAINT question_options_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id)
);


-- public.quizzes definition

-- Drop table

-- DROP TABLE public.quizzes;

CREATE TABLE public.quizzes (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	school_id int4 NOT NULL,
	school_campus_id int4 NOT NULL,
	quiz_title varchar(100) NOT NULL,
	description varchar(500) NOT NULL,
	quiz_type_id int2 NOT NULL,
	class_id int2 NOT NULL,
	subject_id int2 NOT NULL,
	topic_id int2 NOT NULL,
	difficulty_level_id int2 NOT NULL,
	total_questions int2 NOT NULL,
	total_marks int2 NULL,
	time_limit_minutes int2 NULL,
	allowed_attempts int2 NULL,
	shuffle_questions bool DEFAULT true NOT NULL,
	shuffle_options bool DEFAULT true NOT NULL,
	instructions varchar(1000) NOT NULL,
	is_active bool DEFAULT true NOT NULL,
	created_by varchar(100) NOT NULL,
	approved_by varchar(100) NULL,
	approval_status_id int2 NOT NULL,
	lifecycle_status_id int2 NOT NULL,
	created_date date DEFAULT CURRENT_DATE NOT NULL,
	modified_date date NULL,
	is_deleted bool DEFAULT false NOT NULL,
	is_review_required bool DEFAULT true NOT NULL,
	CONSTRAINT quizzes_pkey PRIMARY KEY (id),
	CONSTRAINT quizzes_approval_status_id_fkey FOREIGN KEY (approval_status_id) REFERENCES public.lookups(id),
	CONSTRAINT quizzes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.lookups(id),
	CONSTRAINT quizzes_difficulty_level_id_fkey FOREIGN KEY (difficulty_level_id) REFERENCES public.lookups(id),
	CONSTRAINT quizzes_lifecycle_status_id_fkey FOREIGN KEY (lifecycle_status_id) REFERENCES public.lookups(id),
	CONSTRAINT quizzes_quiz_type_id_fkey FOREIGN KEY (quiz_type_id) REFERENCES public.lookups(id),
	CONSTRAINT quizzes_school_campus_id_fkey FOREIGN KEY (school_campus_id) REFERENCES public.school_campuses(id),
	CONSTRAINT quizzes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id),
	CONSTRAINT quizzes_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.lookups(id),
	CONSTRAINT quizzes_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.lookups(id)
);


-- public.student_group_members definition

-- Drop table

-- DROP TABLE public.student_group_members;

CREATE TABLE public.student_group_members (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	student_group_id int8 NOT NULL,
	student_id int8 NOT NULL,
	created_date date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT student_group_members_group_student_key UNIQUE (student_group_id, student_id),
	CONSTRAINT student_group_members_pkey PRIMARY KEY (id),
	CONSTRAINT student_group_members_student_group_id_fkey FOREIGN KEY (student_group_id) REFERENCES public.student_groups(id),
	CONSTRAINT student_group_members_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.app_user_students(student_id)
);


-- public.quiz_assignments definition

-- Drop table

-- DROP TABLE public.quiz_assignments;

CREATE TABLE public.quiz_assignments (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	quiz_id int8 NOT NULL,
	student_id int8 NOT NULL,
	assigned_by_id int8 NOT NULL,
	student_group_id int8 NULL,
	start_date_time timestamptz NOT NULL,
	end_date_time timestamptz NOT NULL,
	allowed_attempts int2 NOT NULL,
	quiz_result_status int2 NOT NULL,
	is_review_done bool DEFAULT false NOT NULL,
	created_date timestamptz DEFAULT now() NOT NULL,
	modified_date timestamptz NULL,
	CONSTRAINT quiz_assignments_pkey PRIMARY KEY (id),
	CONSTRAINT quiz_assignments_assigned_by_id_fkey FOREIGN KEY (assigned_by_id) REFERENCES public.app_users(id),
	CONSTRAINT quiz_assignments_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id),
	CONSTRAINT quiz_assignments_quiz_result_status_fkey FOREIGN KEY (quiz_result_status) REFERENCES public.lookups(id),
	CONSTRAINT quiz_assignments_student_group_id_fkey FOREIGN KEY (student_group_id) REFERENCES public.student_groups(id),
	CONSTRAINT quiz_assignments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.app_user_students(student_id)
);
CREATE INDEX idx_quiz_assignments_student ON public.quiz_assignments USING btree (student_id);


-- public.quiz_questions definition

-- Drop table

-- DROP TABLE public.quiz_questions;

CREATE TABLE public.quiz_questions (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	quiz_id int8 NOT NULL,
	question_id int8 NOT NULL,
	display_order int2 NOT NULL,
	marks int2 NOT NULL,
	shuffle_options bool DEFAULT true NOT NULL,
	CONSTRAINT quiz_questions_pkey PRIMARY KEY (id),
	CONSTRAINT quiz_questions_quiz_question_key UNIQUE (quiz_id, question_id),
	CONSTRAINT quiz_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id),
	CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id)
);


-- public.quiz_reviews definition

-- Drop table

-- DROP TABLE public.quiz_reviews;

CREATE TABLE public.quiz_reviews (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	review_by varchar(50) NOT NULL,
	ai_review_status int2 NULL,
	teacher_review_status int2 NULL,
	parent_review_status int2 NULL,
	ai_review_comment varchar(1000) NULL,
	teacher_review_comment varchar(1000) NULL,
	parent_review_comment varchar(1000) NULL,
	quiz_id int8 NULL,
	question_id int8 NULL,
	CONSTRAINT chk_review_target_exclusivity CHECK ((((quiz_id IS NOT NULL) AND (question_id IS NULL)) OR ((question_id IS NOT NULL) AND (quiz_id IS NULL)))),
	CONSTRAINT quiz_reviews_pkey PRIMARY KEY (id),
	CONSTRAINT quiz_reviews_ai_review_status_fkey FOREIGN KEY (ai_review_status) REFERENCES public.lookups(id),
	CONSTRAINT quiz_reviews_parent_review_status_fkey FOREIGN KEY (parent_review_status) REFERENCES public.lookups(id),
	CONSTRAINT quiz_reviews_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE,
	CONSTRAINT quiz_reviews_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE,
	CONSTRAINT quiz_reviews_teacher_review_status_fkey FOREIGN KEY (teacher_review_status) REFERENCES public.lookups(id)
);
CREATE INDEX idx_quiz_reviews_question ON public.quiz_reviews USING btree (question_id) WHERE (question_id IS NOT NULL);
CREATE INDEX idx_quiz_reviews_quiz ON public.quiz_reviews USING btree (quiz_id) WHERE (quiz_id IS NOT NULL);


-- public.quiz_attempts definition

-- Drop table

-- DROP TABLE public.quiz_attempts;

CREATE TABLE public.quiz_attempts (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	quiz_id int8 NOT NULL,
	student_id int8 NOT NULL,
	number_of_question_attempt int2 NOT NULL,
	status_id int2 NOT NULL,
	started_date timestamptz DEFAULT now() NOT NULL,
	submitted_date timestamptz NULL,
	time_spent_seconds int2 DEFAULT 0 NOT NULL,
	device_id varchar(100) NOT NULL,
	is_offline_attempt bool DEFAULT false NOT NULL,
	quiz_review_id int8 NULL,
	obtained_marks int2 DEFAULT 0 NOT NULL,
	percentage int2 DEFAULT 0 NOT NULL,
	CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id),
	CONSTRAINT quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id),
	CONSTRAINT quiz_attempts_quiz_review_id_fkey FOREIGN KEY (quiz_review_id) REFERENCES public.quiz_reviews(id),
	CONSTRAINT quiz_attempts_status_id_fkey FOREIGN KEY (status_id) REFERENCES public.lookups(id),
	CONSTRAINT quiz_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.app_user_students(student_id)
);
CREATE INDEX idx_quiz_attempts_student_quiz ON public.quiz_attempts USING btree (student_id, quiz_id);


-- public.quiz_attempt_questions definition

-- Drop table

-- DROP TABLE public.quiz_attempt_questions;

CREATE TABLE public.quiz_attempt_questions (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	quiz_attempt_id int8 NOT NULL,
	question_id int8 NOT NULL,
	display_order int2 NOT NULL,
	quiz_review_id int8 NULL,
	CONSTRAINT quiz_attempt_questions_pkey PRIMARY KEY (id),
	CONSTRAINT quiz_attempt_questions_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id),
	CONSTRAINT quiz_attempt_questions_quiz_attempt_id_fkey FOREIGN KEY (quiz_attempt_id) REFERENCES public.quiz_attempts(id),
	CONSTRAINT quiz_attempt_questions_quiz_review_id_fkey FOREIGN KEY (quiz_review_id) REFERENCES public.quiz_reviews(id)
);
CREATE INDEX idx_quiz_attempt_questions_attempt ON public.quiz_attempt_questions USING btree (quiz_attempt_id);


-- public.quiz_attempt_answers definition

-- Drop table

-- DROP TABLE public.quiz_attempt_answers;

CREATE TABLE public.quiz_attempt_answers (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	quiz_attempt_question_id int8 NOT NULL,
	question_option_id int8 NULL,
	is_correct bool DEFAULT false NOT NULL,
	awarded_marks int2 DEFAULT 0 NOT NULL,
	submitted_text varchar(1000) NULL,
	CONSTRAINT quiz_attempt_answers_pkey PRIMARY KEY (id),
	CONSTRAINT quiz_attempt_answers_question_option_id_fkey FOREIGN KEY (question_option_id) REFERENCES public.question_options(id),
	CONSTRAINT quiz_attempt_answers_quiz_attempt_question_id_fkey FOREIGN KEY (quiz_attempt_question_id) REFERENCES public.quiz_attempt_questions(id)
);
CREATE INDEX idx_quiz_attempt_answers_link ON public.quiz_attempt_answers USING btree (quiz_attempt_question_id);