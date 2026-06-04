# Article Author Freshness QA Briefs

Static browser-local MVP for Article, NewsArticle, and BlogPosting freshness structured data QA.

## Public offer

Paste Article JSON-LD, visible headline/date/author notes, image notes, canonical notes, paywall notes, page type, and owner notes to get a copyable article freshness structured data launch QA brief before blog, newsroom, help-center, documentation, paywalled, syndicated, or migration release.

## Constraints

- no crawl
- no page fetch
- no CMS or newsroom API
- no Rich Results Test
- no Search Console
- no backend or external database
- no Google News eligibility, ranking, indexing, legal, copyright, editorial, identity verification, or paywall compliance advice

## Conversion path

The landing page includes pricing hypothesis, local purchase-intent capture, a public-safe GitHub issue handoff, and copyable request details.

## SEO asset

- [Article structured data freshness checklist](https://ert93333-ops.github.io/article-author-freshness-qa-briefs/article-structured-data-checklist.html)

## Marketing asset

- [Article structured data freshness checklist Gist](https://gist.github.com/ert93333-ops/1e39f26c30dc1ea57f2bf18077b0988e)

## Marketing test URLs

- Landing: `https://ert93333-ops.github.io/article-author-freshness-qa-briefs/?utm_source=github&utm_medium=repo&utm_campaign=article_author_freshness_qa_launch`
- Checklist: `https://ert93333-ops.github.io/article-author-freshness-qa-briefs/article-structured-data-checklist.html?utm_source=github&utm_medium=repo&utm_campaign=article_structured_data_checklist`

## Smoke test

From the Hermes playbook root:

```bash
npm run workflow:article-author-freshness-qa
```
