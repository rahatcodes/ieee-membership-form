# Supabase and Vercel setup

The form saves one complete registration row after Step 2 is submitted. The row contains the IEEE account email and member ID from Step 1, plus every field from Step 2. Step 1 alone is not saved; this avoids storing incomplete registrations.

## 1. Create the Supabase table

Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/irgjuzuoobcivdvxjszi/sql), create a new query, paste the SQL below, and click **Run**.

```sql
create table if not exists public.ieee_member_registrations (
  id uuid primary key default gen_random_uuid(),
  ieee_account_email text not null check (
    char_length(ieee_account_email) <= 254 and
    ieee_account_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  ieee_member_id text not null unique check (ieee_member_id ~ '^[^[:space:]]{5,50}$'),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null check (char_length(last_name) between 1 and 80),
  full_name text not null check (char_length(full_name) between 2 and 120),
  primary_email text not null check (
    char_length(primary_email) <= 254 and
    primary_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ),
  country_region text not null check (char_length(country_region) between 1 and 100),
  address_types text[] not null check (
    cardinality(address_types) > 0 and
    address_types <@ array['Home', 'Work', 'University', 'Other']::text[]
  ),
  address_line_1 text not null check (char_length(address_line_1) between 1 and 200),
  address_line_2 text not null default '' check (char_length(address_line_2) <= 200),
  address_line_3 text not null default '' check (char_length(address_line_3) <= 200),
  city text not null check (char_length(city) between 1 and 100),
  state_province text not null default '' check (char_length(state_province) <= 100),
  zip_postal_code text not null default '' check (char_length(zip_postal_code) <= 30),
  mobile_phone text not null check (mobile_phone ~ '^[+]?[0-9]{10,15}$'),
  referred_by_member boolean not null default false,
  school_country text not null check (char_length(school_country) between 1 and 100),
  school_city text not null check (char_length(school_city) between 1 and 100),
  school_name text not null check (char_length(school_name) between 1 and 200),
  graduation_date text not null check (graduation_date ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  technology_focus text not null check (technology_focus in (
    'Aerospace', 'Bioengineering', 'Communication, Networking and Broadcasting',
    'Components, Circuits, Devices and Systems',
    'Computing and Processing (Hardware/Software)',
    'Engineered Materials, Dielectrics and Plasmas',
    'Fields, Waves and Electromagnetics',
    'General Topics for Engineers (Math, Science and Engineering)',
    'Geoscience', 'Nuclear Engineering', 'Photonics and Electro-Optics',
    'Power, Energy and Industry Applications', 'Robotics and Control Systems',
    'Signal Processing and Analysis', 'Transportation', 'Engineering Profession', 'Other'
  )),
  undergraduate_program_accredited boolean not null,
  ulab_id text not null check (ulab_id ~ '^[0-9]{6,12}$'),
  department text not null check (department in (
    'CSE', 'EEE', 'BBA', 'Bangla', 'English',
    'Environmental Science', 'International Relations'
  )),
  semester text not null check (semester in (
    '1st', '2nd', '3rd', '4th', '5th', '6th',
    '7th', '8th', '9th', '10th', '11th', '12th'
  )),
  ulab_mail text not null check (
    ulab_mail ~* '^[^[:space:]@]+@([a-z0-9-]+[.])*ulab[.]edu[.]bd$'
  ),
  whatsapp text not null check (whatsapp ~ '^[+]?[0-9]{10,15}$'),
  facebook_url text check (
    facebook_url is null or facebook_url ~* '^https?://(www[.]|m[.]|web[.])?(facebook|fb)[.]com/.+'
  ),
  transaction_id text not null check (char_length(transaction_id) between 4 and 120),
  created_at timestamptz not null default now()
);

alter table public.ieee_member_registrations enable row level security;
revoke all on table public.ieee_member_registrations from anon, authenticated;
grant insert on table public.ieee_member_registrations to service_role;
```

If the table already exists, use this migration instead of recreating it. Existing rows are retained; the new columns are nullable for historical rows, while the API requires and validates all new values on future registrations.

```sql
alter table public.ieee_member_registrations
  drop constraint if exists ieee_member_registrations_ieee_member_id_check;

alter table public.ieee_member_registrations
  add constraint ieee_member_registrations_ieee_member_id_check
  check (ieee_member_id ~ '^[^[:space:]]{5,50}$');

alter table public.ieee_member_registrations
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists primary_email text,
  add column if not exists country_region text,
  add column if not exists address_types text[] not null default '{}',
  add column if not exists address_line_1 text,
  add column if not exists address_line_2 text not null default '',
  add column if not exists address_line_3 text not null default '',
  add column if not exists city text,
  add column if not exists state_province text not null default '',
  add column if not exists zip_postal_code text not null default '',
  add column if not exists mobile_phone text,
  add column if not exists referred_by_member boolean not null default false,
  add column if not exists school_country text,
  add column if not exists school_city text,
  add column if not exists school_name text,
  add column if not exists student_status text,
  add column if not exists degree_sought text,
  add column if not exists academic_program text,
  add column if not exists graduation_date text,
  add column if not exists field_of_study text,
  add column if not exists technology_focus text,
  add column if not exists undergraduate_program_accredited boolean,
  add column if not exists facebook_url text;

alter table public.ieee_member_registrations
  alter column student_status drop not null,
  alter column degree_sought drop not null,
  alter column academic_program drop not null,
  alter column field_of_study drop not null,
  alter column facebook_url drop not null;

alter table public.ieee_member_registrations
  drop constraint if exists ieee_member_registrations_facebook_url_check;

alter table public.ieee_member_registrations
  add constraint ieee_member_registrations_facebook_url_check
  check (
    facebook_url is null or facebook_url ~* '^https?://(www[.]|m[.]|web[.])?(facebook|fb)[.]com/.+'
  );

alter table public.ieee_member_registrations
  drop constraint if exists ieee_member_registrations_technology_focus_check;

alter table public.ieee_member_registrations
  add constraint ieee_member_registrations_technology_focus_check
  check (technology_focus in (
    'Aerospace', 'Bioengineering', 'Communication, Networking and Broadcasting',
    'Components, Circuits, Devices and Systems',
    'Computing and Processing (Hardware/Software)',
    'Engineered Materials, Dielectrics and Plasmas',
    'Fields, Waves and Electromagnetics',
    'General Topics for Engineers (Math, Science and Engineering)',
    'Geoscience', 'Nuclear Engineering', 'Photonics and Electro-Optics',
    'Power, Energy and Industry Applications', 'Robotics and Control Systems',
    'Signal Processing and Analysis', 'Transportation', 'Engineering Profession', 'Other'
  )) not valid;
```

The table intentionally has no public read policy. The Vercel API uses the server-only `service_role` secret for inserts; never put that secret in `index.html` or a browser environment variable.

## 2. Add the Supabase secrets to Vercel

In Supabase, select the `irgjuzuoobcivdvxjszi` project, then open **Project Settings → API Keys → Secret keys → Create new secret API key**. In the dialog shown, enter a custom name such as `ieee_registration_vercel` (the name is only a label; Supabase does not allow the reserved names `anon` or `service_role` here). Optionally add a description such as `Vercel registration API`, create the key, then copy its value, which starts with `sb_secret_`. The Vercel endpoint sends this new key in the `apikey` header only. Treat it like a password: never paste it into chat, `index.html`, or a `NEXT_PUBLIC_` variable. The project URL is:

```text
https://irgjuzuoobcivdvxjszi.supabase.co
```

In Vercel, open the project and go to **Settings → Environment Variables**. Add these variables for Production and Preview (and Development if using Vercel locally):

| Name | Value |
| --- | --- |
| `SUPABASE_URL` | `https://irgjuzuoobcivdvxjszi.supabase.co` |
| `SUPABASE_SECRET_KEY` | The `sb_secret_...` key copied from Supabase |

Do not use the `anon`/publishable key for `SUPABASE_SECRET_KEY`, and do not prefix either variable with `NEXT_PUBLIC_`. Save the settings and redeploy after adding or changing them.

## 3. Deploy the site to Vercel

1. Put this folder in a GitHub repository and push the files, including `index.html` and `api/register.js`.
2. In Vercel, choose **Add New → Project**, import that repository, and keep the project root set to this folder.
3. Vercel serves `index.html` as the site and deploys `api/register.js` as the `/api/register` serverless function. No build command or framework preset is required for this plain HTML setup.
4. Add the two environment variables from Step 2, then deploy or redeploy.
5. Test a registration using test data, then confirm the row appears in Supabase under **Table Editor → ieee_member_registrations**.

For local development, copy `.env.example` to `.env.local`, fill in the service-role secret, and run the project with the Vercel CLI (`vercel dev`). Never commit `.env.local` or share the service-role secret. The form endpoint is public, so consider adding CAPTCHA or rate limiting before sharing the registration link widely.

## Stored fields

| Form step | Supabase column |
| --- | --- |
| Step 1: IEEE Account email | `ieee_account_email` |
| Step 1: IEEE member ID | `ieee_member_id` |
| Step 2: First and last name | `first_name`, `last_name`, `full_name` |
| Step 2: Primary email | `primary_email` |
| Step 2: Country/region | `country_region` |
| Step 2: Address types | `address_types` |
| Step 2: Address lines | `address_line_1`, `address_line_2`, `address_line_3` |
| Step 2: City, state/province, ZIP/postal code | `city`, `state_province`, `zip_postal_code` |
| Step 2: Mobile phone and IEEE referral | `mobile_phone`, `referred_by_member` |
| Step 2: School location and name | `school_country`, `school_city`, `school_name` |
| Step 2: Graduation date and technology focus | `graduation_date`, `technology_focus` |
| Step 2: Undergraduate program accreditation | `undergraduate_program_accredited` |
| Step 2: ULAB ID | `ulab_id` |
| Step 2: Department | `department` |
| Step 2: Semester | `semester` |
| Step 2: ULAB mail | `ulab_mail` |
| Step 2: WhatsApp number | `whatsapp` |
| Step 2: Facebook profile link | `facebook_url` |
| Step 2: Transaction ID | `transaction_id` |
| Generated by database | `id`, `created_at` |

If you already ran the earlier version of this setup SQL and created the `member_name` column, run this one-time migration in the SQL Editor instead of creating a second table:

```sql
alter table public.ieee_member_registrations
  rename column member_name to ieee_account_email;

alter table public.ieee_member_registrations
  drop constraint if exists ieee_member_registrations_member_name_check;

alter table public.ieee_member_registrations
  add constraint ieee_member_registrations_ieee_account_email_check
  check (
    char_length(ieee_account_email) <= 254 and
    ieee_account_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  );
```

After applying this legacy rename, also run the existing-table migration above to add the new fields and update Member ID validation.

The form's live Supabase connection is enabled only after the table SQL is applied and the Vercel environment variables are set to the real project URL and secret key.