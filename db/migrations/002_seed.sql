-- Seed data. Everything here is editable in /admin. Items the clinic has not
-- yet verified are flagged (needs_review / hours_confirmed = false).

alter table services add column if not exists needs_review boolean not null default true;

insert into clinic_settings (
  id, clinic_name, tagline, phone, whatsapp_number, whatsapp_enabled,
  address_line, locality, city, state, postal_code, country, maps_query,
  google_rating, google_review_count, google_reviews_url, rating_snapshot_note,
  about_story, about_approach, working_hours, hours_confirmed
) values (
  1,
  'SPYNUS Physiotherapy & Wellness Centre',
  'Personalized physiotherapy and wellness care in Bengaluru.',
  '+918109467757', '+918109467757', false,
  'Rayasandra Main Road', 'Chikkanagamangala', 'Bengaluru', 'Karnataka', '560099', 'IN',
  'SPYNUS Physiotherapy & Wellness Centre, Rayasandra Main Road, Chikkanagamangala, Bengaluru 560099',
  4.9, 65,
  'https://www.google.com/maps/search/?api=1&query=SPYNUS+Physiotherapy+%26+Wellness+Centre+Chikkanagamangala+Bengaluru',
  'Google rating from a listing snapshot supplied by the clinic.',
  'SPYNUS Physiotherapy & Wellness Centre is a patient-focused physiotherapy and wellness clinic on Rayasandra Main Road, Chikkanagamangala, Bengaluru. We focus on understanding each person''s concerns and building a care plan around their goals.',
  'Every plan starts with listening and assessment. Patients tell us they value clear explanations of their exercises — so we make sure you understand what each movement is for, how to do it safely, and how to continue at home.',
  '{
    "0": null,
    "1": {"open":"09:00","close":"19:00","breaks":[{"start":"13:00","end":"14:00"}]},
    "2": {"open":"09:00","close":"19:00","breaks":[{"start":"13:00","end":"14:00"}]},
    "3": {"open":"09:00","close":"19:00","breaks":[{"start":"13:00","end":"14:00"}]},
    "4": {"open":"09:00","close":"19:00","breaks":[{"start":"13:00","end":"14:00"}]},
    "5": {"open":"09:00","close":"19:00","breaks":[{"start":"13:00","end":"14:00"}]},
    "6": {"open":"09:00","close":"19:00","breaks":[{"start":"13:00","end":"14:00"}]}
  }'::jsonb,
  false
) on conflict (id) do nothing;

insert into calendar_connections (id, status) values (1, 'disconnected') on conflict (id) do nothing;

insert into practitioners (name, title, is_public, sort_order)
select 'Dr. Swathi', 'Clinician', true, 0
where not exists (select 1 from practitioners);

insert into services (slug, name, short_description, description, conditions, approach, duration_minutes, icon, is_published, needs_review, sort_order) values
('back-pain-physiotherapy', 'Back Pain Physiotherapy',
 'Assessment-led care for lower and upper back pain, focused on easing pain and restoring comfortable movement.',
 'Back pain can affect how you sit, sleep, work and move. Your physiotherapist will assess your posture, movement and daily habits, then build a plan aimed at reducing pain and helping you return to the activities that matter to you.',
 array['Lower back pain','Upper back and neck stiffness','Posture-related discomfort','Pain when sitting or bending'],
 'A typical plan may combine hands-on techniques, guided therapeutic exercise and practical advice for daily activities, adjusted to how you respond.',
 45, 'spine', true, true, 1),
('frozen-shoulder-rehabilitation', 'Frozen Shoulder Rehabilitation',
 'Gradual, guided rehabilitation to help improve shoulder mobility and reduce stiffness.',
 'Frozen shoulder can make everyday movements such as reaching, dressing or lifting difficult. Rehabilitation focuses on gently and progressively improving range of motion while keeping discomfort manageable.',
 array['Shoulder stiffness','Reduced range of motion','Pain when reaching overhead','Difficulty with daily tasks'],
 'Care usually progresses in stages — mobility work, stretching and strengthening — with a home exercise programme explained clearly at each step.',
 45, 'shoulder', true, true, 2),
('joint-pain-mobility-rehabilitation', 'Joint Pain & Mobility Rehabilitation',
 'Support for stiff or painful joints, aiming to improve comfort, strength and freedom of movement.',
 'Joint pain and stiffness — in the knees, hips, wrists or elsewhere — can limit walking, climbing stairs and staying active. Your plan focuses on mobility, strength and confidence in movement.',
 array['Knee and hip discomfort','Joint stiffness','Reduced mobility','Difficulty with stairs or walking'],
 'Assessment of the affected joint and surrounding muscles, followed by targeted mobility and strengthening exercises and activity guidance.',
 45, 'joint', true, true, 3),
('ankle-rehabilitation', 'Ankle Rehabilitation',
 'Rehabilitation to help restore ankle mobility, stability and comfortable walking.',
 'After an ankle sprain or a period of stiffness, the ankle can feel weak, painful or unstable. Rehabilitation aims to reduce pain and rebuild mobility, balance and strength.',
 array['Ankle stiffness','Post-sprain recovery','Reduced ankle mobility','Balance and stability concerns'],
 'Progressive mobility, strengthening and balance exercises, with guidance on returning to walking and activity safely.',
 40, 'ankle', true, true, 4),
('therapeutic-exercise-movement-guidance', 'Therapeutic Exercise & Movement Guidance',
 'Personalised exercise programmes with clear, step-by-step guidance you can follow at home.',
 'The right exercises, done correctly, are central to recovery. We design programmes around your goals and make sure you understand each exercise — why it helps, how to perform it and how to progress.',
 array['Ongoing rehabilitation','Muscle weakness','Return to activity','Home exercise support'],
 'Demonstration, supervised practice and a clear home programme, reviewed and progressed at follow-up visits.',
 45, 'dumbbell', true, true, 5),
('physiotherapy-consultation', 'Personalized Physiotherapy Consultation',
 'A one-to-one assessment to understand your concern and agree a personalised care plan.',
 'Not sure what you need? A consultation is the place to start. We listen to your concerns, assess your movement and explain our findings in plain language before recommending next steps.',
 array['New or ongoing pain','Movement difficulties','Unsure which treatment you need','Second opinion on an exercise plan'],
 'Discussion of your history and goals, a physical assessment, and a clear explanation of the recommended plan.',
 45, 'stethoscope', true, true, 0)
on conflict (slug) do nothing;

insert into testimonials (author_label, content, rating, is_verbatim, source_url, is_approved, sort_order)
select * from (values
 ('Summary of Google reviews', 'Patients describe receiving personalised physiotherapy care.', null::int, false, null::text, true, 1),
 ('Summary of Google reviews', 'Reviewers mention positive experiences with back-pain recovery.', null, false, null, true, 2),
 ('Summary of Google reviews', 'Several reviews mention positive frozen-shoulder rehabilitation experiences.', null, false, null, true, 3),
 ('Summary of Google reviews', 'Patients appreciate clear explanations of their exercises.', null, false, null, true, 4),
 ('Summary of Google reviews', 'Reviewers mention improved ankle mobility and reduced pain.', null, false, null, true, 5)
) as t
where not exists (select 1 from testimonials);
