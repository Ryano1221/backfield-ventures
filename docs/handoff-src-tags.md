# Handoff signup source tags

Off-site links to `/handoff` should include `?src=` so a signup stores where the subscriber came from.

Use these values:

- `ig-bio` for the Instagram bio
- `li-page` for the LinkedIn page
- `li-post` for a LinkedIn post
- `ig-post` for an Instagram post
- `email-ps` for an email P.S.
- `swap-<newsletter>` for a newsletter swap. Replace `<newsletter>` with the other newsletter's name.
- `guide-<slug>` for a guide. Replace `<slug>` with the guide slug.

Example: `https://www.backfieldventures.com/handoff?src=ig-bio`

The form also sends `utm_source`, `utm_medium`, and `utm_campaign` when they are on the page URL. If `src` is missing, it sends the referring host instead.

In-site links already set their own values: `site-nav`, `site-nav-mobile`, `site-footer`, and `home-contact`.
