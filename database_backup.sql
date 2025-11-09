--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bowl_favorites; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.bowl_favorites (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    bowl_id integer NOT NULL,
    favorited_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.bowl_favorites OWNER TO suhrad;

--
-- Name: bowl_favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.bowl_favorites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bowl_favorites_id_seq OWNER TO suhrad;

--
-- Name: bowl_favorites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.bowl_favorites_id_seq OWNED BY public.bowl_favorites.id;


--
-- Name: bowl_follows; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.bowl_follows (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    bowl_id integer NOT NULL,
    followed_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.bowl_follows OWNER TO suhrad;

--
-- Name: bowl_follows_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.bowl_follows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bowl_follows_id_seq OWNER TO suhrad;

--
-- Name: bowl_follows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.bowl_follows_id_seq OWNED BY public.bowl_follows.id;


--
-- Name: bowls; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.bowls (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    icon_url character varying,
    category character varying(50) DEFAULT 'general'::character varying NOT NULL,
    member_count integer DEFAULT 0 NOT NULL,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.bowls OWNER TO suhrad;

--
-- Name: bowls_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.bowls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.bowls_id_seq OWNER TO suhrad;

--
-- Name: bowls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.bowls_id_seq OWNED BY public.bowls.id;


--
-- Name: comments; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    content text NOT NULL,
    author_id character varying NOT NULL,
    post_id integer,
    parent_id integer,
    upvotes integer DEFAULT 0 NOT NULL,
    downvotes integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    poll_id integer
);


ALTER TABLE public.comments OWNER TO suhrad;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.comments_id_seq OWNER TO suhrad;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    type character varying(32) NOT NULL,
    content text NOT NULL,
    link character varying(512),
    read boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO suhrad;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO suhrad;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: org_trust_votes; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.org_trust_votes (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    organization_id integer NOT NULL,
    trust_vote boolean NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.org_trust_votes OWNER TO suhrad;

--
-- Name: org_trust_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.org_trust_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.org_trust_votes_id_seq OWNER TO suhrad;

--
-- Name: org_trust_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.org_trust_votes_id_seq OWNED BY public.org_trust_votes.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    logo_url character varying,
    website character varying,
    created_by character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.organizations OWNER TO suhrad;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.organizations_id_seq OWNER TO suhrad;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: poll_options; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.poll_options (
    id integer NOT NULL,
    poll_id integer NOT NULL,
    text character varying(200) NOT NULL,
    vote_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.poll_options OWNER TO suhrad;

--
-- Name: poll_options_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.poll_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.poll_options_id_seq OWNER TO suhrad;

--
-- Name: poll_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.poll_options_id_seq OWNED BY public.poll_options.id;


--
-- Name: poll_votes; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.poll_votes (
    id integer NOT NULL,
    poll_id integer NOT NULL,
    option_id integer NOT NULL,
    user_id character varying NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.poll_votes OWNER TO suhrad;

--
-- Name: poll_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.poll_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.poll_votes_id_seq OWNER TO suhrad;

--
-- Name: poll_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.poll_votes_id_seq OWNED BY public.poll_votes.id;


--
-- Name: polls; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.polls (
    id integer NOT NULL,
    title character varying(300) NOT NULL,
    description text,
    author_id character varying NOT NULL,
    bowl_id integer,
    organization_id integer,
    allow_multiple_choices boolean DEFAULT false NOT NULL,
    is_anonymous boolean DEFAULT false NOT NULL,
    end_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    post_id integer,
    upvotes integer DEFAULT 0 NOT NULL,
    downvotes integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.polls OWNER TO suhrad;

--
-- Name: polls_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.polls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.polls_id_seq OWNER TO suhrad;

--
-- Name: polls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.polls_id_seq OWNED BY public.polls.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner:  suhrad
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    title character varying(300) NOT NULL,
    content text NOT NULL,
    type character varying(20) NOT NULL,
    sentiment character varying(20),
    is_anonymous boolean DEFAULT false NOT NULL,
    author_id character varying NOT NULL,
    organization_id integer,
    bowl_id integer,
    image_url character varying,
    upvotes integer DEFAULT 0 NOT NULL,
    downvotes integer DEFAULT 0 NOT NULL,
    comment_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.posts OWNER TO suhrad;

--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.posts_id_seq OWNER TO suhrad;

--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO suhrad;

--
-- Name: users; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.users (
    id character varying NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    password character varying,
    profile_image_url character varying,
    karma integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO suhrad;

--
-- Name: votes; Type: TABLE; Schema: public; Owner: suhrad
--

CREATE TABLE public.votes (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    target_id integer NOT NULL,
    target_type character varying(20) NOT NULL,
    vote_type character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.votes OWNER TO suhrad;

--
-- Name: votes_id_seq; Type: SEQUENCE; Schema: public; Owner: suhrad
--

CREATE SEQUENCE public.votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.votes_id_seq OWNER TO suhrad;

--
-- Name: votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: suhrad
--

ALTER SEQUENCE public.votes_id_seq OWNED BY public.votes.id;


--
-- Name: bowl_favorites id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowl_favorites ALTER COLUMN id SET DEFAULT nextval('public.bowl_favorites_id_seq'::regclass);


--
-- Name: bowl_follows id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowl_follows ALTER COLUMN id SET DEFAULT nextval('public.bowl_follows_id_seq'::regclass);


--
-- Name: bowls id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowls ALTER COLUMN id SET DEFAULT nextval('public.bowls_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: org_trust_votes id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.org_trust_votes ALTER COLUMN id SET DEFAULT nextval('public.org_trust_votes_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: poll_options id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.poll_options ALTER COLUMN id SET DEFAULT nextval('public.poll_options_id_seq'::regclass);


--
-- Name: poll_votes id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.poll_votes ALTER COLUMN id SET DEFAULT nextval('public.poll_votes_id_seq'::regclass);


--
-- Name: polls id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.polls ALTER COLUMN id SET DEFAULT nextval('public.polls_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: votes id; Type: DEFAULT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.votes ALTER COLUMN id SET DEFAULT nextval('public.votes_id_seq'::regclass);


--
-- Data for Name: bowl_favorites; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.bowl_favorites (id, user_id, bowl_id, favorited_at) FROM stdin;
1	user_1754063948193_6b8lm7ebk	47	2025-08-02 15:22:59.032824
\.


--
-- Data for Name: bowl_follows; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.bowl_follows (id, user_id, bowl_id, followed_at) FROM stdin;
3	user_1754063948193_6b8lm7ebk	43	2025-08-02 10:26:00.207356
4	user_1754063948193_6b8lm7ebk	36	2025-08-02 10:26:01.353337
5	user_1754063948193_6b8lm7ebk	32	2025-08-02 10:26:02.133938
6	user_1754063948193_6b8lm7ebk	5	2025-08-02 13:05:37.902115
7	user_1754063948193_6b8lm7ebk	9	2025-08-02 13:06:01.163565
8	user_1754063948193_6b8lm7ebk	50	2025-08-02 13:08:17.82844
9	user_1754063948193_6b8lm7ebk	10	2025-08-02 13:19:42.948481
10	user_1754063948193_6b8lm7ebk	13	2025-08-02 13:22:31.508565
12	user_1754063948193_6b8lm7ebk	47	2025-08-02 13:45:28.250193
\.


--
-- Data for Name: bowls; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.bowls (id, name, description, icon_url, category, member_count, created_by, created_at) FROM stdin;
1	Tech	Technology industry discussions, news, and insights	\N	industries	0	\N	2025-08-01 21:25:58.486385
2	Healthcare	Healthcare industry discussions and career advice	\N	industries	0	\N	2025-08-01 21:25:58.487772
3	Finance	Finance and banking industry discussions	\N	industries	0	\N	2025-08-01 21:25:58.488377
4	Retail	Retail and e-commerce industry discussions	\N	industries	0	\N	2025-08-01 21:25:58.488944
6	Transportation	Transportation and logistics industry	\N	industries	0	\N	2025-08-01 21:25:58.489994
7	Crypto & Web3	Cryptocurrency, blockchain, and Web3 industry	\N	industries	0	\N	2025-08-01 21:25:58.490675
8	Fintech	Financial technology and digital banking	\N	industries	0	\N	2025-08-01 21:25:58.491218
11	Data Science	Data science, analytics, and machine learning	\N	job-groups	0	\N	2025-08-01 21:25:58.492558
12	Design	UX/UI design, graphic design, and creative discussions	\N	job-groups	0	\N	2025-08-01 21:25:58.493097
14	Marketing	Marketing strategies, campaigns, and digital marketing	\N	job-groups	0	\N	2025-08-01 21:25:58.494141
16	Operations	Operations management and process optimization	\N	job-groups	0	\N	2025-08-01 21:25:58.495304
17	Personal Finance	Personal finance, investing, and money management	\N	general	0	\N	2025-08-01 21:25:58.495771
18	Work Visa	Work visa discussions and immigration advice	\N	general	0	\N	2025-08-01 21:25:58.496261
19	Housing	Housing market, real estate, and home buying	\N	general	0	\N	2025-08-01 21:25:58.496749
20	Layoffs	Layoff discussions, support, and job search advice	\N	general	0	\N	2025-08-01 21:25:58.497392
21	Relationships	Workplace relationships and professional networking	\N	general	0	\N	2025-08-01 21:25:58.497964
22	Artificial Intelligence	AI discussions, trends, and career opportunities	\N	general	0	\N	2025-08-01 21:25:58.498518
23	Offer Evaluation	Job offer evaluation and negotiation advice	\N	general	0	\N	2025-08-01 21:25:58.499092
24	Resume Review	Resume feedback and career advice	\N	general	0	\N	2025-08-01 21:25:58.499644
25	WFH & RTO	Work from home and return to office discussions	\N	general	0	\N	2025-08-01 21:25:58.500017
26	Working Parents	Balancing work and family life	\N	general	0	\N	2025-08-01 21:25:58.50036
27	Health & Wellness	Mental health, work-life balance, and wellness	\N	general	0	\N	2025-08-01 21:25:58.500902
28	Politics	Workplace politics and corporate culture	\N	general	0	\N	2025-08-01 21:25:58.501423
29	Ethereum	Ethereum blockchain, smart contracts, and DeFi	\N	general	0	\N	2025-08-01 21:25:58.50193
30	Bitcoin	Bitcoin discussions, trading, and investment	\N	general	0	\N	2025-08-01 21:25:58.502445
31	DeFi	Decentralized finance protocols and yield farming	\N	general	0	\N	2025-08-01 21:25:58.502939
33	Security	Cybersecurity, crypto security, and best practices	\N	general	0	\N	2025-08-01 21:25:58.503953
34	Blockchain	Blockchain technology and distributed systems	\N	general	0	\N	2025-08-01 21:25:58.504523
35	Bay Area	San Francisco Bay Area tech community	\N	user-moderated	0	\N	2025-08-01 21:25:58.505026
37	Seattle	Seattle area professionals and tech workers	\N	user-moderated	0	\N	2025-08-01 21:25:58.506097
38	Austin	Austin tech and startup community	\N	user-moderated	0	\N	2025-08-01 21:25:58.506692
40	Chicago	Chicago professional community	\N	user-moderated	0	\N	2025-08-01 21:25:58.507551
41	Miami	Miami professional community	\N	user-moderated	0	\N	2025-08-01 21:25:58.507946
42	Dallas	Dallas professional community	\N	user-moderated	0	\N	2025-08-01 21:25:58.508443
44	Interview Experiences	Interview stories and preparation tips	\N	user-moderated	0	\N	2025-08-01 21:25:58.509429
45	Manager Issues	Management challenges and leadership discussions	\N	user-moderated	0	\N	2025-08-01 21:25:58.509939
46	Financial Independence	FIRE movement and financial independence	\N	user-moderated	0	\N	2025-08-01 21:25:58.510388
48	Side Gigs	Side hustle ideas and entrepreneurial discussions	\N	user-moderated	0	\N	2025-08-01 21:25:58.511218
49	Women in Tech	Women in technology and STEM careers	\N	user-moderated	0	\N	2025-08-01 21:25:58.511694
47	Real Estate Investing	Real estate investment strategies and discussions	\N	user-moderated	1	\N	2025-08-01 21:25:58.510718
39	Los Angeles	Los Angeles professional community	\N	user-moderated	0	\N	2025-08-01 21:25:58.507189
43	Career Coaching	Career development and coaching discussions	\N	user-moderated	1	\N	2025-08-01 21:25:58.50893
36	New York	New York City professional community	\N	user-moderated	1	\N	2025-08-01 21:25:58.505536
32	NFTs	Non-fungible tokens, digital art, and collectibles	\N	general	1	\N	2025-08-01 21:25:58.503449
5	Media	Media, entertainment, and content creation	\N	industries	1	\N	2025-08-01 21:25:58.48947
9	Software Engineering	Software development, coding, and engineering discussions	\N	job-groups	1	\N	2025-08-01 21:25:58.491632
50	Coffee Lovers	Coffee culture and workplace coffee discussions	\N	user-moderated	1	\N	2025-08-01 21:25:58.512174
10	Product Management	Product management, strategy, and roadmap discussions	\N	job-groups	1	\N	2025-08-01 21:25:58.492025
51	Work Memes	Funny workplace memes and humor	\N	user-moderated	0	\N	2025-08-01 21:25:58.512553
13	Sales	Sales strategies, techniques, and career advice	\N	job-groups	1	\N	2025-08-01 21:25:58.493609
15	Human Resources	HR policies, recruitment, and workplace culture	\N	job-groups	0	\N	2025-08-01 21:25:58.494688
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.comments (id, content, author_id, post_id, parent_id, upvotes, downvotes, created_at, poll_id) FROM stdin;
1	Test comment 1 on post #1	testuser3	1	\N	0	0	2025-08-01 21:25:58.516191	\N
2	Test comment 2 on post #1	testuser4	1	\N	0	0	2025-08-01 21:25:58.519904	\N
3	Test comment 1 on post #2	testuser4	2	\N	0	0	2025-08-01 21:25:58.523566	\N
4	Test comment 2 on post #2	testuser5	2	\N	0	0	2025-08-01 21:25:58.524309	\N
5	Test comment 1 on post #3	testuser5	3	\N	0	0	2025-08-01 21:25:58.52778	\N
6	Test comment 2 on post #3	testuser1	3	\N	0	0	2025-08-01 21:25:58.528586	\N
7	Test comment 1 on post #4	testuser1	4	\N	0	0	2025-08-01 21:25:58.531724	\N
8	Test comment 2 on post #4	testuser2	4	\N	0	0	2025-08-01 21:25:58.532557	\N
9	Test comment 1 on post #5	testuser2	5	\N	0	0	2025-08-01 21:25:58.535109	\N
10	Test comment 2 on post #5	testuser3	5	\N	0	0	2025-08-01 21:25:58.535887	\N
11	Test comment 1 on post #6	testuser3	6	\N	0	0	2025-08-01 21:25:58.538524	\N
12	Test comment 2 on post #6	testuser4	6	\N	0	0	2025-08-01 21:25:58.541914	\N
13	Test comment 1 on post #7	testuser4	7	\N	0	0	2025-08-01 21:25:58.545156	\N
14	Test comment 2 on post #7	testuser5	7	\N	0	0	2025-08-01 21:25:58.546108	\N
15	Test comment 1 on post #8	testuser5	8	\N	0	0	2025-08-01 21:25:58.548909	\N
16	Test comment 2 on post #8	testuser1	8	\N	0	0	2025-08-01 21:25:58.550385	\N
17	Test comment 1 on post #9	testuser1	9	\N	0	0	2025-08-01 21:25:58.553793	\N
18	Test comment 2 on post #9	testuser2	9	\N	0	0	2025-08-01 21:25:58.554669	\N
19	Test comment 1 on post #10	testuser2	10	\N	0	0	2025-08-01 21:25:58.557161	\N
20	Test comment 2 on post #10	testuser3	10	\N	0	0	2025-08-01 21:25:58.55816	\N
21	gmg m 	user_1754063948193_6b8lm7ebk	12	\N	0	0	2025-08-02 11:30:51.931705	\N
22	gm gm 	user_1754063948193_6b8lm7ebk	13	\N	0	0	2025-08-02 11:51:50.299785	\N
23	gm 	user_1754063948193_6b8lm7ebk	13	\N	0	0	2025-08-02 11:53:47.685709	\N
24	yooo	user_1754063948193_6b8lm7ebk	13	\N	0	0	2025-08-02 12:02:03.44732	\N
25	gm	user_1754063948193_6b8lm7ebk	13	24	0	0	2025-08-02 12:07:27.439742	\N
26	yooo reply 	user_1754063948193_6b8lm7ebk	13	24	0	0	2025-08-02 12:07:37.484284	\N
27	heyyyyy	user_1754063948193_6b8lm7ebk	13	26	0	0	2025-08-02 12:11:23.095786	\N
28	gm	user_1754063948193_6b8lm7ebk	13	27	0	0	2025-08-02 12:13:19.905159	\N
29	reply 	user_1754063948193_6b8lm7ebk	13	28	0	0	2025-08-02 12:13:57.359114	\N
30	hh	user_1754063948193_6b8lm7ebk	13	29	0	0	2025-08-02 12:17:43.147315	\N
31	reply	user_1754063948193_6b8lm7ebk	10	20	0	0	2025-08-02 12:19:51.071458	\N
32	hii	user_1754063948193_6b8lm7ebk	10	20	0	0	2025-08-02 12:20:16.073728	\N
33	gm	user_1754063948193_6b8lm7ebk	10	32	0	0	2025-08-02 12:22:43.005187	\N
34	gm	user_1754063948193_6b8lm7ebk	10	33	0	0	2025-08-02 12:24:44.719839	\N
35	hey	user_1754063948193_6b8lm7ebk	10	34	0	0	2025-08-02 12:25:55.018654	\N
36	gm	user_1754063948193_6b8lm7ebk	10	35	0	0	2025-08-02 12:30:46.636265	\N
37	yooo	user_1754063948193_6b8lm7ebk	10	19	0	0	2025-08-02 12:31:01.661634	\N
38	hi	user_1754063948193_6b8lm7ebk	\N	\N	0	0	2025-08-02 17:46:12.579776	3
39	gm\n	user_1754063948193_6b8lm7ebk	\N	\N	0	0	2025-08-02 17:46:42.34125	2
40	yoo	user_1754063948193_6b8lm7ebk	\N	38	0	0	2025-08-02 17:50:11.748847	3
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.notifications (id, user_id, type, content, link, read, created_at) FROM stdin;
1	testuser1	comment	Someone commented on your review: "reply"	/posts/10	f	2025-08-02 12:19:51.091516
2	testuser1	comment	Someone commented on your review: "hii"	/posts/10	f	2025-08-02 12:20:16.088689
3	testuser1	comment	Someone commented on your review: "gm"	/posts/10	f	2025-08-02 12:22:43.025619
4	testuser1	comment	Someone commented on your review: "gm"	/posts/10	f	2025-08-02 12:24:44.746043
5	testuser1	comment	Someone commented on your review: "hey"	/posts/10	f	2025-08-02 12:25:55.069569
6	testuser1	comment	Someone commented on your review: "gm"	/posts/10	f	2025-08-02 12:30:46.670025
7	testuser1	comment	Someone commented on your review: "yooo"	/posts/10	f	2025-08-02 12:31:01.76748
8	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:49:58.917071
9	testuser4	downvote	Someone downvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:49:59.88336
10	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:01.548406
11	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:02.043437
12	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:02.471654
13	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:02.929375
14	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:03.352479
15	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:03.77714
16	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:04.427827
17	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:04.991821
18	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:05.711751
19	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:06.034898
20	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:06.377701
21	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:06.619563
22	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:06.826905
23	testuser4	upvote	Someone upvoted your review: "Test Review 8"	/posts/8	f	2025-08-02 12:50:07.026338
\.


--
-- Data for Name: org_trust_votes; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.org_trust_votes (id, user_id, organization_id, trust_vote, created_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.organizations (id, name, description, logo_url, website, created_by, created_at) FROM stdin;
1	Test Organization 1	This is a test organization #1.	\N	https://org1.com	testuser1	2025-08-01 21:25:58.483607
2	Test Organization 2	This is a test organization #2.	\N	https://org2.com	testuser1	2025-08-01 21:25:58.484873
3	Test Organization 3	This is a test organization #3.	\N	https://org3.com	testuser1	2025-08-01 21:25:58.485623
\.


--
-- Data for Name: poll_options; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.poll_options (id, poll_id, text, vote_count, created_at) FROM stdin;
1	1	Option #1	0	2025-08-02 10:53:48.461532
2	1	Option #2	0	2025-08-02 10:53:48.465628
4	2	byw	9	2025-08-02 10:57:08.059483
3	2	Hii	9	2025-08-02 10:57:08.05676
7	3	jkhjkhkjhOption #3	2	2025-08-02 14:30:13.634678
5	3	Optionjkhujkhj #1	5	2025-08-02 14:30:13.622387
6	3	Option #jkhjkhjk2	7	2025-08-02 14:30:13.625235
\.


--
-- Data for Name: poll_votes; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.poll_votes (id, poll_id, option_id, user_id, created_at) FROM stdin;
1	2	4	user_1754063948193_6b8lm7ebk	2025-08-02 10:57:12.987774
2	2	4	user_1754063948193_6b8lm7ebk	2025-08-02 10:57:15.019462
3	2	4	user_1754063948193_6b8lm7ebk	2025-08-02 14:11:57.888431
4	2	3	user_1754063948193_6b8lm7ebk	2025-08-02 14:12:02.057715
5	2	3	user_1754063948193_6b8lm7ebk	2025-08-02 14:14:01.85798
6	2	4	user_1754063948193_6b8lm7ebk	2025-08-02 14:14:06.157322
7	2	3	user_1754063948193_6b8lm7ebk	2025-08-02 14:14:08.206554
8	2	4	user_1754063948193_6b8lm7ebk	2025-08-02 14:14:09.90827
9	2	3	user_1754063948193_6b8lm7ebk	2025-08-02 14:14:11.775872
10	2	4	user_1754063948193_6b8lm7ebk	2025-08-02 14:14:30.038754
11	2	3	user_1754063948193_6b8lm7ebk	2025-08-02 14:14:43.2742
12	2	4	user_1754063948193_6b8lm7ebk	2025-08-02 14:22:56.886016
13	2	3	user_1754063948193_6b8lm7ebk	2025-08-02 14:25:17.483812
14	2	4	user_1754063948193_6b8lm7ebk	2025-08-02 14:25:19.460596
15	2	3	user_1754063948193_6b8lm7ebk	2025-08-02 14:25:20.744019
16	2	4	user_1754063948193_6b8lm7ebk	2025-08-02 14:25:22.294998
17	2	3	user_1754063948193_6b8lm7ebk	2025-08-02 14:26:04.016708
18	2	3	user_1754063948193_6b8lm7ebk	2025-08-02 14:28:28.318998
19	3	5	user_1754063948193_6b8lm7ebk	2025-08-02 14:31:19.392593
20	3	6	user_1754063948193_6b8lm7ebk	2025-08-02 14:31:32.035494
21	3	5	user_1754063948193_6b8lm7ebk	2025-08-02 14:33:25.874886
22	3	5	user_1754063948193_6b8lm7ebk	2025-08-02 14:33:53.039213
23	3	7	user_1754063948193_6b8lm7ebk	2025-08-02 14:51:43.644991
24	3	5	user_1754063948193_6b8lm7ebk	2025-08-02 15:16:05.540805
25	3	6	user_1754063948193_6b8lm7ebk	2025-08-02 15:18:15.254999
26	3	7	user_1754063948193_6b8lm7ebk	2025-08-02 15:18:18.551562
27	3	5	user_1754063948193_6b8lm7ebk	2025-08-02 15:18:20.491976
28	3	6	user_1754063948193_6b8lm7ebk	2025-08-02 15:20:11.710121
29	3	6	user_1754063948193_6b8lm7ebk	2025-08-02 15:24:25.337638
30	3	6	user_1754063948193_6b8lm7ebk	2025-08-02 15:24:27.715295
31	3	6	user_1754063948193_6b8lm7ebk	2025-08-02 15:24:38.183282
32	3	6	user_1754063948193_6b8lm7ebk	2025-08-02 15:24:57.013843
\.


--
-- Data for Name: polls; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.polls (id, title, description, author_id, bowl_id, organization_id, allow_multiple_choices, is_anonymous, end_date, created_at, updated_at, post_id, upvotes, downvotes) FROM stdin;
1	,mn,m	mnmn,	user_1754063948193_6b8lm7ebk	50	2	f	f	\N	2025-08-02 10:53:48.455233	2025-08-02 10:53:48.455233	11	0	0
2	Poll	Testing	user_1754063948193_6b8lm7ebk	50	1	f	f	\N	2025-08-02 10:57:08.053911	2025-08-02 10:57:08.053911	12	0	0
3	jh jkh jkh k jkh jk h	Hey guys, We are CLS Global, the #1 Market Making Retainer in Crypto focused on helping our clients grow within the crypto sphere. We take on projects and drive high-quality traffic to clients' platforms through multiple channels such as Discord, Reddit, Twitter/X, and more.\n\nWe are now expanding and in addition to user acquisition, we also provide development services for clients across DeFi, trading, and Web3.\n\nRequirements:\n\nProven experience developing on Solana and Ethereum/ERC20 (e.g. smart contracts, dApps, token creation)\n\nDeep understanding of DeFi protocols, trading logic, and performance optimization\n\nPrior experience building or working with scalping, sniper, or arbitrage bots\n\nFamiliarity with RPC providers like QuickNode, Helius, and real-time trading infrastructure\n\nBonus: Ability to integrate AI-based trading strategies or token signal systems\n\nWhat you’ll do:\n\nBuild and deploy high-performance bots for scalping, sniping, and arbitrage on Solana and Ethereum\n\nDevelop smart contracts and dApps tailored for client use cases\n\nHelp fine-tune token selection using AI tools and trading data\n\nCollaborate with the marketing team to align dev features with growth strategies\n\nWhat we offer:\n\nFlexible and remote work environment (our team is based in over 8 countries)\n\nStable pay through crypto with a fixed monthly income of $4,000 and performance bonuses\n\nA friendly and growing community\n\nCompany events twice a year\n\nIf you’re interested and want to join us, please submit the form below and we’ll see if we’re a good fit: https://docs.google.com/forms/d/e/1FAIpQLSeTGwx6PR82ipaPIJ2cIuOW7KrIsqcgRRUAmf1u9KsZJMuHsg/viewform?usp=header\n\nThank you!	user_1754063948193_6b8lm7ebk	36	2	f	f	\N	2025-08-02 14:30:13.618425	2025-08-02 14:30:13.618425	14	1	0
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.posts (id, title, content, type, sentiment, is_anonymous, author_id, organization_id, bowl_id, image_url, upvotes, downvotes, comment_count, created_at, updated_at) FROM stdin;
14	jh jkh jkh k jkh jk h	Hey guys, We are CLS Global, the #1 Market Making Retainer in Crypto focused on helping our clients grow within the crypto sphere. We take on projects and drive high-quality traffic to clients' platforms through multiple channels such as Discord, Reddit, Twitter/X, and more.\n\nWe are now expanding and in addition to user acquisition, we also provide development services for clients across DeFi, trading, and Web3.\n\nRequirements:\n\nProven experience developing on Solana and Ethereum/ERC20 (e.g. smart contracts, dApps, token creation)\n\nDeep understanding of DeFi protocols, trading logic, and performance optimization\n\nPrior experience building or working with scalping, sniper, or arbitrage bots\n\nFamiliarity with RPC providers like QuickNode, Helius, and real-time trading infrastructure\n\nBonus: Ability to integrate AI-based trading strategies or token signal systems\n\nWhat you’ll do:\n\nBuild and deploy high-performance bots for scalping, sniping, and arbitrage on Solana and Ethereum\n\nDevelop smart contracts and dApps tailored for client use cases\n\nHelp fine-tune token selection using AI tools and trading data\n\nCollaborate with the marketing team to align dev features with growth strategies\n\nWhat we offer:\n\nFlexible and remote work environment (our team is based in over 8 countries)\n\nStable pay through crypto with a fixed monthly income of $4,000 and performance bonuses\n\nA friendly and growing community\n\nCompany events twice a year\n\nIf you’re interested and want to join us, please submit the form below and we’ll see if we’re a good fit: https://docs.google.com/forms/d/e/1FAIpQLSeTGwx6PR82ipaPIJ2cIuOW7KrIsqcgRRUAmf1u9KsZJMuHsg/viewform?usp=header\n\nThank you!	poll	\N	f	user_1754063948193_6b8lm7ebk	2	36	\N	1	0	0	2025-08-02 14:30:13.608776	2025-08-02 10:34:43.425
1	Test Discussion 1	This is a discussion content for post #1.	discussion	\N	f	testuser2	\N	2	\N	0	0	2	2025-08-01 21:25:58.513303	2025-08-01 15:55:58.52
2	Test Review 2	This is a review content for post #2.	review	negative	f	testuser3	3	\N	\N	0	0	2	2025-08-01 21:25:58.522849	2025-08-01 15:55:58.524
3	Test Discussion 3	This is a discussion content for post #3.	discussion	\N	t	testuser4	\N	4	\N	0	0	2	2025-08-01 21:25:58.527057	2025-08-01 15:55:58.528
10	Test Review 10	This is a review content for post #10.	review	neutral	f	testuser1	2	\N	\N	0	0	9	2025-08-01 21:25:58.556704	2025-08-02 07:01:01.676
4	Test Review 4	This is a review content for post #4.	review	neutral	f	testuser5	2	\N	\N	0	0	2	2025-08-01 21:25:58.531206	2025-08-01 15:55:58.532
5	Test Discussion 5	This is a discussion content for post #5.	discussion	\N	f	testuser1	\N	6	\N	0	0	2	2025-08-01 21:25:58.534637	2025-08-01 15:55:58.536
6	Test Review 6	This is a review content for post #6.	review	positive	t	testuser2	1	\N	\N	0	0	2	2025-08-01 21:25:58.538007	2025-08-01 15:55:58.542
13	How can I develop the skills and experience needed for a Web3 community role such as associate, moderator, or manager?	Hello Everyone,\n\nI’m eager to work in the Web3 space, especially in community roles like associate or moderator. While I don’t have formal experience yet, I’m passionate about crypto and willing to put in the work.\n\nWhat’s the best way to get started and build relevant experience? Any advice from those already in the space would mean a lot\n\nThank youHello Everyone,\n\nI’m eager to work in the Web3 space, especially in community roles like associate or moderator. While I don’t have formal experience yet, I’m passionate about crypto and willing to put in the work.\n\nWhat’s the best way to get started and build relevant experience? Any advice from those already in the space would mean a lot\n\nThank youHello Everyone,\n\nI’m eager to work in the Web3 space, especially in community roles like associate or moderator. While I don’t have formal experience yet, I’m passionate about crypto and willing to put in the work.\n\nWhat’s the best way to get started and build relevant experience? Any advice from those already in the space would mean a lot\n\nThank youHello Everyone,\n\nI’m eager to work in the Web3 space, especially in community roles like associate or moderator. While I don’t have formal experience yet, I’m passionate about crypto and willing to put in the work.\n\nWhat’s the best way to get started and build relevant experience? Any advice from those already in the space would mean a lot\n\nThank youHello Everyone,\n\nI’m eager to work in the Web3 space, especially in community roles like associate or moderator. While I don’t have formal experience yet, I’m passionate about crypto and willing to put in the work.\n\nWhat’s the best way to get started and build relevant experience? Any advice from those already in the space would mean a lot\n\nThank youHello Everyone,\n\nI’m eager to work in the Web3 space, especially in community roles like associate or moderator. While I don’t have formal experience yet, I’m passionate about crypto and willing to put in the work.\n\nWhat’s the best way to get started and build relevant experience? Any advice from those already in the space would mean a lot\n\nThank youHello Everyone,\n\nI’m eager to work in the Web3 space, especially in community roles like associate or moderator. While I don’t have formal experience yet, I’m passionate about crypto and willing to put in the work.\n\nWhat’s the best way to get started and build relevant experience? Any advice from those already in the space would mean a lot\n\nThank youHello Everyone,\n\nI’m eager to work in the Web3 space, especially in community roles like associate or moderator. While I don’t have formal experience yet, I’m passionate about crypto and willing to put in the work.\n\nWhat’s the best way to get started and build relevant experience? Any advice from those already in the space would mean a lot\n\nThank youHello Everyone,\n\nI’m eager to work in the Web3 space, especially in community roles like associate or moderator. While I don’t have formal experience yet, I’m passionate about crypto and willing to put in the work.\n\nWhat’s the best way to get started and build relevant experience? Any advice from those already in the space would mean a lot\n\nThank you	discussion	\N	f	user_1754063948193_6b8lm7ebk	\N	50	\N	1	0	9	2025-08-02 11:35:52.178995	2025-08-02 06:47:43.17
7	Test Discussion 7	This is a discussion content for post #7.	discussion	\N	f	testuser3	\N	8	\N	0	0	2	2025-08-01 21:25:58.544445	2025-08-01 15:55:58.546
9	Test Discussion 9	This is a discussion content for post #9.	discussion	\N	t	testuser5	\N	10	\N	0	0	2	2025-08-01 21:25:58.553042	2025-08-01 15:55:58.555
11	,mn,m	mnmn,	poll	\N	f	user_1754063948193_6b8lm7ebk	2	50	\N	0	0	0	2025-08-02 10:53:48.444779	2025-08-02 10:53:48.444779
12	Poll	Testing	poll	\N	f	user_1754063948193_6b8lm7ebk	1	50	\N	0	0	1	2025-08-02 10:57:08.047416	2025-08-02 06:00:51.943
8	Test Review 8	This is a review content for post #8.	review	negative	f	testuser4	3	\N	\N	2	1	2	2025-08-01 21:25:58.548374	2025-08-02 07:20:07.017
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.sessions (sid, sess, expire) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.users (id, email, first_name, last_name, password, profile_image_url, karma, created_at, updated_at) FROM stdin;
testuser1	testuser1@example.com	Test1	User1	password	\N	0	2025-08-01 21:25:58.476596	2025-08-01 21:25:58.476596
testuser2	testuser2@example.com	Test2	User2	password	\N	0	2025-08-01 21:25:58.479472	2025-08-01 21:25:58.479472
testuser3	testuser3@example.com	Test3	User3	password	\N	0	2025-08-01 21:25:58.480711	2025-08-01 21:25:58.480711
testuser5	testuser5@example.com	Test5	User5	password	\N	0	2025-08-01 21:25:58.482756	2025-08-01 21:25:58.482756
testuser4	testuser4@example.com	Test4	User4	password	\N	28	2025-08-01 21:25:58.481648	2025-08-02 07:20:07.021
user_1754063948193_6b8lm7ebk	ashirwad198@gmail.com	Suhrad	Makwana	$2b$10$KNpT9r/lAdNvuwGOEsRh0.LQ8rC8X5p5GMwMqy2a55MP74JCEsgY6	\N	4	2025-08-01 15:59:08.193	2025-08-02 10:34:43.434
\.


--
-- Data for Name: votes; Type: TABLE DATA; Schema: public; Owner: suhrad
--

COPY public.votes (id, user_id, target_id, target_type, vote_type, created_at) FROM stdin;
1	testuser2	1	post	up	2025-08-01 21:25:58.521009
2	testuser3	1	post	down	2025-08-01 21:25:58.521729
3	testuser4	1	post	up	2025-08-01 21:25:58.522302
4	testuser3	2	post	up	2025-08-01 21:25:58.525409
5	testuser4	2	post	down	2025-08-01 21:25:58.525944
6	testuser5	2	post	up	2025-08-01 21:25:58.526466
7	testuser4	3	post	up	2025-08-01 21:25:58.529379
8	testuser5	3	post	down	2025-08-01 21:25:58.529866
9	testuser1	3	post	up	2025-08-01 21:25:58.530536
10	testuser5	4	post	up	2025-08-01 21:25:58.533544
11	testuser1	4	post	down	2025-08-01 21:25:58.533939
12	testuser2	4	post	up	2025-08-01 21:25:58.534276
13	testuser1	5	post	up	2025-08-01 21:25:58.536651
14	testuser2	5	post	down	2025-08-01 21:25:58.537057
15	testuser3	5	post	up	2025-08-01 21:25:58.537427
16	testuser2	6	post	up	2025-08-01 21:25:58.542921
17	testuser3	6	post	down	2025-08-01 21:25:58.543416
18	testuser4	6	post	up	2025-08-01 21:25:58.543889
19	testuser3	7	post	up	2025-08-01 21:25:58.546887
20	testuser4	7	post	down	2025-08-01 21:25:58.547513
21	testuser5	7	post	up	2025-08-01 21:25:58.547962
22	testuser4	8	post	up	2025-08-01 21:25:58.551738
23	testuser5	8	post	down	2025-08-01 21:25:58.552193
24	testuser1	8	post	up	2025-08-01 21:25:58.552608
25	testuser5	9	post	up	2025-08-01 21:25:58.555489
26	testuser1	9	post	down	2025-08-01 21:25:58.555975
27	testuser2	9	post	up	2025-08-01 21:25:58.556331
28	testuser1	10	post	up	2025-08-01 21:25:58.559122
29	testuser2	10	post	down	2025-08-01 21:25:58.559602
30	testuser3	10	post	up	2025-08-01 21:25:58.560121
31	user_1754063948193_6b8lm7ebk	13	post	up	2025-08-02 11:51:45.845078
41	user_1754063948193_6b8lm7ebk	14	post	up	2025-08-02 16:04:43.414271
43	user_1754063948193_6b8lm7ebk	3	poll	down	2025-08-02 18:03:34.895144
\.


--
-- Name: bowl_favorites_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.bowl_favorites_id_seq', 2, true);


--
-- Name: bowl_follows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.bowl_follows_id_seq', 13, true);


--
-- Name: bowls_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.bowls_id_seq', 51, true);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.comments_id_seq', 40, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.notifications_id_seq', 23, true);


--
-- Name: org_trust_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.org_trust_votes_id_seq', 1, false);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.organizations_id_seq', 3, true);


--
-- Name: poll_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.poll_options_id_seq', 7, true);


--
-- Name: poll_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.poll_votes_id_seq', 32, true);


--
-- Name: polls_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.polls_id_seq', 3, true);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.posts_id_seq', 14, true);


--
-- Name: votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: suhrad
--

SELECT pg_catalog.setval('public.votes_id_seq', 43, true);


--
-- Name: bowl_favorites bowl_favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowl_favorites
    ADD CONSTRAINT bowl_favorites_pkey PRIMARY KEY (id);


--
-- Name: bowl_follows bowl_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowl_follows
    ADD CONSTRAINT bowl_follows_pkey PRIMARY KEY (id);


--
-- Name: bowls bowls_name_unique; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowls
    ADD CONSTRAINT bowls_name_unique UNIQUE (name);


--
-- Name: bowls bowls_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowls
    ADD CONSTRAINT bowls_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: org_trust_votes org_trust_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.org_trust_votes
    ADD CONSTRAINT org_trust_votes_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: poll_options poll_options_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.poll_options
    ADD CONSTRAINT poll_options_pkey PRIMARY KEY (id);


--
-- Name: poll_votes poll_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (id);


--
-- Name: polls polls_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_pkey PRIMARY KEY (id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: votes votes_pkey; Type: CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: suhrad
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: bowl_favorites bowl_favorites_bowl_id_bowls_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowl_favorites
    ADD CONSTRAINT bowl_favorites_bowl_id_bowls_id_fk FOREIGN KEY (bowl_id) REFERENCES public.bowls(id);


--
-- Name: bowl_favorites bowl_favorites_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowl_favorites
    ADD CONSTRAINT bowl_favorites_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bowl_follows bowl_follows_bowl_id_bowls_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowl_follows
    ADD CONSTRAINT bowl_follows_bowl_id_bowls_id_fk FOREIGN KEY (bowl_id) REFERENCES public.bowls(id);


--
-- Name: bowl_follows bowl_follows_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowl_follows
    ADD CONSTRAINT bowl_follows_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bowls bowls_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.bowls
    ADD CONSTRAINT bowls_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: comments comments_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: comments comments_parent_id_comments_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_comments_id_fk FOREIGN KEY (parent_id) REFERENCES public.comments(id);


--
-- Name: comments comments_poll_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id);


--
-- Name: comments comments_post_id_posts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: org_trust_votes org_trust_votes_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.org_trust_votes
    ADD CONSTRAINT org_trust_votes_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: org_trust_votes org_trust_votes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.org_trust_votes
    ADD CONSTRAINT org_trust_votes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organizations organizations_created_by_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_created_by_users_id_fk FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: poll_options poll_options_poll_id_polls_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.poll_options
    ADD CONSTRAINT poll_options_poll_id_polls_id_fk FOREIGN KEY (poll_id) REFERENCES public.polls(id);


--
-- Name: poll_votes poll_votes_option_id_poll_options_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_option_id_poll_options_id_fk FOREIGN KEY (option_id) REFERENCES public.poll_options(id);


--
-- Name: poll_votes poll_votes_poll_id_polls_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_poll_id_polls_id_fk FOREIGN KEY (poll_id) REFERENCES public.polls(id);


--
-- Name: poll_votes poll_votes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: polls polls_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: polls polls_bowl_id_bowls_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_bowl_id_bowls_id_fk FOREIGN KEY (bowl_id) REFERENCES public.bowls(id);


--
-- Name: polls polls_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: polls polls_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.polls
    ADD CONSTRAINT polls_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id);


--
-- Name: posts posts_author_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_users_id_fk FOREIGN KEY (author_id) REFERENCES public.users(id);


--
-- Name: posts posts_bowl_id_bowls_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_bowl_id_bowls_id_fk FOREIGN KEY (bowl_id) REFERENCES public.bowls(id);


--
-- Name: posts posts_organization_id_organizations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_organization_id_organizations_id_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: votes votes_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: suhrad
--

ALTER TABLE ONLY public.votes
    ADD CONSTRAINT votes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

