-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.children (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  parent_user_id uuid NOT NULL,
  name character varying NOT NULL,
  date_of_birth date NOT NULL,
  gender character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  avatar_url text,
  avatar_path text,
  CONSTRAINT children_pkey PRIMARY KEY (id),
  CONSTRAINT children_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES public.parents(user_id)
);
CREATE TABLE public.entries (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  child_id bigint NOT NULL,
  title character varying NOT NULL,
  content text NOT NULL,
  entry_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  photo_paths ARRAY NOT NULL DEFAULT '{}'::text[],
  CONSTRAINT entries_pkey PRIMARY KEY (id),
  CONSTRAINT entries_child_id_fkey FOREIGN KEY (child_id) REFERENCES public.children(id)
);
CREATE TABLE public.parents (
  user_id uuid NOT NULL,
  username character varying,
  date_of_birth date,
  gender character varying,
  created_at timestamp with time zone DEFAULT now(),
  avatar_path text,
  CONSTRAINT parents_pkey PRIMARY KEY (user_id),
  CONSTRAINT parents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.photos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  entry_id bigint NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  file_path text,
  CONSTRAINT photos_pkey PRIMARY KEY (id),
  CONSTRAINT photos_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES public.entries(id)
);