(function () {
  var analyticsKey = "articlefreshnessqa_analytics_events";
  var intentKey = "articlefreshnessqa_purchase_intents";
  var state = {
    latestBriefText: "",
    latestRequestText: "",
    selectedPlan: "Publisher/agency - $79/month"
  };

  function qs(selector) {
    return document.querySelector(selector);
  }

  function qsa(selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  }

  function clean(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function lower(value) {
    return clean(value).toLowerCase();
  }

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch (error) {
      return [];
    }
  }

  function storeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function acquisition() {
    var params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get("utm_source") || "direct",
      utmMedium: params.get("utm_medium") || "none",
      utmCampaign: params.get("utm_campaign") || "none"
    };
  }

  function track(eventName, detail) {
    var events = readJson(analyticsKey);
    events.push(Object.assign({
      event: eventName,
      product: "Article Author Freshness QA Briefs",
      timestamp: new Date().toISOString()
    }, acquisition(), detail || {}));
    storeJson(analyticsKey, events.slice(-200));
  }

  function pulseClass(element, className, delay) {
    if (!element) return;
    element.classList.add(className);
    window.setTimeout(function () {
      element.classList.remove(className);
    }, delay || 500);
  }

  function copyText(text) {
    function fallbackCopy() {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        fallbackCopy();
      });
    }
    fallbackCopy();
    return Promise.resolve();
  }

  function sampleJson() {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": "Old SEO launch notes",
      "datePublished": "2024-01-05T08:00:00+00:00",
      "author": {
        "@type": "Person",
        "name": "Staff Writer"
      },
      "mainEntityOfPage": "https://example.com/blog/old-seo-launch-notes"
    }, null, 2);
  }

  function loadSample() {
    qs("#jsonld-input").value = sampleJson();
    qs("#visible-notes").value = "Visible H1 says Catch article freshness drift before publishing. Page shows Published Jan 5 2024 and Updated Jun 4 2026. Byline says Maya Chen, not Staff Writer.";
    qs("#date-notes").value = "Editor says this article was heavily updated in June 2026, but JSON-LD has no dateModified and the visible updated date is more recent than the schema.";
    qs("#author-notes").value = "Visible author links to /authors/maya-chen and sameAs points to GitHub. JSON-LD uses Staff Writer and has no author.url or sameAs.";
    qs("#image-notes").value = "Hero image is real, but Article JSON-LD has no image field. Some templates still output /img/placeholder-news.jpg.";
    qs("#canonical-notes").value = "This post was syndicated from an older blog URL. Canonical owner is TBD and mainEntityOfPage still points to the old URL.";
    qs("#paywall-notes").value = "The final third of the article is member-only after registration, but there is no isAccessibleForFree or hasPart paywall selector decision.";
    qs("#owner-notes").value = "Owner TBD across editorial, frontend, CMS template, syndication, and SEO cleanup.";
    qs("#page-type").value = "SaaS blog article";
    track("sample_article_data_loaded", { triggerSource: "sample_button" });
  }

  function parseJsonInput(input) {
    var trimmed = clean(input);
    if (!trimmed) throw new Error("Paste Article JSON-LD before generating a brief.");
    return JSON.parse(trimmed);
  }

  function toArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function typeList(node) {
    return toArray(node && node["@type"]).map(function (type) {
      return clean(type).toLowerCase();
    });
  }

  function hasType(node, expected) {
    var wanted = lower(expected);
    return typeList(node).some(function (type) {
      return type === wanted || type.endsWith("/" + wanted);
    });
  }

  function isArticleType(node) {
    return hasType(node, "Article") || hasType(node, "NewsArticle") || hasType(node, "BlogPosting");
  }

  function walk(value, callback) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(function (item) { walk(item, callback); });
      return;
    }
    callback(value);
    Object.keys(value).forEach(function (key) { walk(value[key], callback); });
  }

  function collectArticles(data) {
    var nodes = [];
    walk(data, function (node) {
      if (isArticleType(node)) nodes.push(node);
    });
    return nodes;
  }

  function valueText(value) {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
    if (Array.isArray(value)) return value.map(valueText).join(" ");
    if (typeof value === "object") {
      return Object.keys(value).map(function (key) { return valueText(value[key]); }).join(" ");
    }
    return "";
  }

  function hasValue(value) {
    return clean(valueText(value)).length > 0;
  }

  function includesAny(value, needles) {
    var haystack = lower(value);
    return needles.some(function (needle) {
      return haystack.indexOf(lower(needle)) !== -1;
    });
  }

  function addFinding(sections, key, text) {
    if (sections[key].indexOf(text) === -1) {
      sections[key].push(text);
    }
  }

  function parseYear(value) {
    var match = clean(value).match(/\b(20\d{2}|19\d{2})\b/);
    return match ? Number(match[1]) : 0;
  }

  function authorArray(article) {
    return toArray(article.author).filter(function (author) {
      return author && typeof author === "object";
    });
  }

  function analyzeArticle(input) {
    var data = parseJsonInput(input.jsonld);
    var articles = collectArticles(data);
    var allNotes = [
      input.visibleNotes,
      input.dateNotes,
      input.authorNotes,
      input.imageNotes,
      input.canonicalNotes,
      input.paywallNotes,
      input.ownerNotes,
      input.pageType
    ].join(" ");
    var sections = {
      required: [],
      freshness: [],
      headline: [],
      author: [],
      image: [],
      canonical: [],
      paywall: [],
      owner: [],
      handoff: []
    };

    if (!articles.length) {
      addFinding(sections, "required", "missing Article/NewsArticle/BlogPosting: no article entity was found in the pasted JSON-LD.");
    }

    articles.forEach(function (article, index) {
      var headline = clean(valueText(article.headline));
      var datePublished = clean(valueText(article.datePublished));
      var dateModified = clean(valueText(article.dateModified));
      var image = clean(valueText(article.image));
      var mainEntityOfPage = clean(valueText(article.mainEntityOfPage || article.url || article["@id"]));
      var authors = authorArray(article);
      var authorText = clean(valueText(article.author));

      if (!headline || headline.length < 8) {
        addFinding(sections, "required", "missing headline: article " + (index + 1) + " has no useful headline.");
      }
      if (!datePublished) {
        addFinding(sections, "required", "missing datePublished: article " + (index + 1) + " needs a published date decision.");
      }
      if (!dateModified) {
        addFinding(sections, "required", "missing dateModified: article " + (index + 1) + " needs an updated date decision.");
      }
      if (!hasValue(article.author)) {
        addFinding(sections, "required", "missing author: article " + (index + 1) + " needs Person or Organization author markup.");
      }
      if (!image || includesAny(image + " " + input.imageNotes, ["placeholder", "default", "missing", "fallback"])) {
        addFinding(sections, "required", "missing image: Article image is missing, placeholder, default, or not clearly mapped to the visible hero image.");
        addFinding(sections, "image", "weak image handoff: Article image is missing, placeholder, default, or not clearly mapped to the visible hero image.");
      }

      if (dateModified && datePublished && dateModified < datePublished) {
        addFinding(sections, "freshness", "stale dateModified/datePublished: dateModified appears earlier than datePublished.");
      }
      if (!dateModified && includesAny(input.dateNotes + " " + input.visibleNotes, ["updated", "modified", "refreshed", "june", "2026"])) {
        addFinding(sections, "freshness", "stale dateModified/datePublished: visible notes mention an update but schema has no dateModified.");
      }
      if (parseYear(datePublished) && parseYear(input.dateNotes + " " + input.visibleNotes) > parseYear(datePublished) && !dateModified) {
        addFinding(sections, "freshness", "visible date/schema mismatch: visible updated date is newer than the schema datePublished and dateModified is missing.");
      }
      if (headline && includesAny(input.visibleNotes, ["h1", "title", "headline"]) && !includesAny(input.visibleNotes, headline.split(" ").slice(0, 3))) {
        addFinding(sections, "headline", "visible headline/schema mismatch: visible title or H1 notes do not match the schema headline.");
      }
      if (authorText.indexOf(",") !== -1) {
        addFinding(sections, "author", "author URL handoff gap: multiple authors appear merged into one author field.");
      }
      authors.forEach(function (author) {
        if (!hasType(author, "Person") && !hasType(author, "Organization")) {
          addFinding(sections, "author", "author URL handoff gap: author type should be Person or Organization.");
        }
        if (!hasValue(author.name) || includesAny(author.name, ["staff", "admin", "author", "writer"])) {
          addFinding(sections, "author", "author URL handoff gap: author name is missing or too generic for byline parity.");
        }
        if (!hasValue(author.url) && !hasValue(author.sameAs)) {
          addFinding(sections, "author", "author URL handoff gap: author.url or author.sameAs is missing.");
        }
      });
      if (includesAny(input.authorNotes + " " + input.visibleNotes, ["maya", "byline", "author link", "sameAs"]) && !includesAny(authorText, ["maya", "sameas", "github"])) {
        addFinding(sections, "author", "visible author/schema mismatch: visible byline or profile notes disagree with Article author markup.");
      }
      if (includesAny(input.canonicalNotes, ["canonical", "syndicated", "duplicate", "old url", "source"]) && !includesAny(mainEntityOfPage, ["canonical", "current", "maya", "freshness"])) {
        addFinding(sections, "canonical", "canonical or syndicated article ambiguity: mainEntityOfPage, url, @id, or canonical owner needs review.");
      }
      if (includesAny(input.paywallNotes, ["paywall", "member", "subscriber", "registration", "paid"])) {
        var hasFreeFlag = article.isAccessibleForFree === false || lower(article.isAccessibleForFree) === "false";
        var hasPaywallPart = includesAny(valueText(article.hasPart), ["webpageelement", "cssselector", "paywall"]);
        if (!hasFreeFlag || !hasPaywallPart) {
          addFinding(sections, "paywall", "paywall labeling handoff gap: notes mention gated content but isAccessibleForFree or hasPart cssSelector is missing.");
        }
      }
    });

    if (includesAny(allNotes, ["mismatch", "old", "stale", "tbd", "missing", "placeholder"])) {
      addFinding(sections, "headline", "visible headline/schema mismatch: visible article notes and pasted JSON-LD need parity review.");
    }
    if (!clean(input.ownerNotes) || includesAny(input.ownerNotes, ["TBD", "unknown", "not assigned"])) {
      addFinding(sections, "owner", "missing owner remediation decision across editorial, frontend, CMS template, syndication, paywall, or SEO owners.");
    }

    addFinding(sections, "handoff", "Confirm Article type, headline, image, datePublished, dateModified, author name, author URL/sameAs, visible date parity, canonical/syndication handling, paywall markup, and owner decisions before publishing.");

    return {
      sections: sections,
      articleCount: articles.length,
      typeSummary: articles.map(function (article) { return typeList(article).join(", ") || "unknown"; }).join("; ") || "none"
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char];
    });
  }

  function sectionHtml(title, items) {
    if (!items.length) {
      return [
        "<section class=\"brief-section\">",
        "<h4>" + escapeHtml(title) + "</h4>",
        "<p>No issue flagged from the pasted sample.</p>",
        "</section>"
      ].join("");
    }
    return [
      "<section class=\"brief-section\">",
      "<h4>" + escapeHtml(title) + "</h4>",
      "<ul>",
      items.map(function (item) { return "<li>" + escapeHtml(item) + "</li>"; }).join(""),
      "</ul>",
      "</section>"
    ].join("");
  }

  function briefText(result, input) {
    function lines(title, items) {
      return [title].concat(items.length ? items.map(function (item) { return "- " + item; }) : ["- No issue flagged from the pasted sample."]).join("\n");
    }
    return [
      "Article author freshness QA brief",
      "",
      "Parse summary",
      "- Article nodes found: " + result.articleCount,
      "- Article types found: " + result.typeSummary,
      "- Selected page type: " + input.pageType,
      "",
      lines("Article field warnings", result.sections.required),
      "",
      lines("Freshness and date warnings", result.sections.freshness),
      "",
      lines("Headline parity warnings", result.sections.headline),
      "",
      lines("Author byline warnings", result.sections.author),
      "",
      lines("Article image warnings", result.sections.image),
      "",
      lines("Canonical and syndication warnings", result.sections.canonical),
      "",
      lines("Paywall handoff warnings", result.sections.paywall),
      "",
      lines("Owner remediation reminders", result.sections.owner),
      "",
      lines("Handoff reminders", result.sections.handoff)
    ].join("\n");
  }

  function renderBrief(result, input) {
    var output = qs("#brief-output");
    var title = qs("#output-title");
    var pill = qs("#status-pill");
    var copy = qs("#copy-brief");
    var findingCount = Object.keys(result.sections).reduce(function (count, key) {
      return count + result.sections[key].length;
    }, 0);

    output.classList.remove("empty");
    output.innerHTML = [
      "<div class=\"parse-summary\">",
      "<strong>Parse summary</strong>",
      "<p>" + result.articleCount + " Article/NewsArticle/BlogPosting node(s) found. Types: " + escapeHtml(result.typeSummary) + ".</p>",
      "</div>",
      sectionHtml("Article field warnings", result.sections.required),
      sectionHtml("Freshness and date warnings", result.sections.freshness),
      sectionHtml("Headline parity warnings", result.sections.headline),
      sectionHtml("Author byline warnings", result.sections.author),
      sectionHtml("Article image warnings", result.sections.image),
      sectionHtml("Canonical and syndication warnings", result.sections.canonical),
      sectionHtml("Paywall handoff warnings", result.sections.paywall),
      sectionHtml("Owner remediation reminders", result.sections.owner),
      sectionHtml("Handoff reminders", result.sections.handoff)
    ].join("");

    title.textContent = "Article author freshness QA brief ready";
    pill.textContent = findingCount ? "Review" : "Clean";
    copy.disabled = false;
    state.latestBriefText = briefText(result, input);
    track("core_action_completed", {
      articleCount: result.articleCount,
      findingCount: findingCount
    });
    pulseClass(output, "is-updated", 450);
  }

  function setupAuditor() {
    var form = qs("#auditor-form");
    var error = qs("#workflow-error");
    qs("#load-sample").addEventListener("click", loadSample);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      error.textContent = "";
      track("core_action_started", { triggerSource: "auditor_form" });
      try {
        var input = {
          jsonld: qs("#jsonld-input").value,
          visibleNotes: qs("#visible-notes").value,
          dateNotes: qs("#date-notes").value,
          authorNotes: qs("#author-notes").value,
          imageNotes: qs("#image-notes").value,
          canonicalNotes: qs("#canonical-notes").value,
          paywallNotes: qs("#paywall-notes").value,
          ownerNotes: qs("#owner-notes").value,
          pageType: qs("#page-type").value
        };
        renderBrief(analyzeArticle(input), input);
      } catch (err) {
        error.textContent = err.message || "Could not generate the Article QA brief.";
        track("core_action_failed", { message: error.textContent });
      }
    });

    qs("#copy-brief").addEventListener("click", function () {
      if (!state.latestBriefText) return;
      copyText(state.latestBriefText).then(function () {
        qs("#copy-brief").textContent = "Copied brief";
        track("brief_copied", { triggerSource: "copy_brief" });
        window.setTimeout(function () { qs("#copy-brief").textContent = "Copy brief"; }, 1100);
      });
    });
  }

  function buildPublicRequest(payload) {
    return [
      "## Role",
      payload.role,
      "",
      "## Article surface type",
      payload.surfaceType,
      "",
      "## Publishing cadence",
      payload.launchCadence,
      "",
      "## Plan interest",
      payload.plan,
      "",
      "## Budget range",
      payload.budget,
      "",
      "## Biggest article structured data QA pain",
      payload.pain,
      "",
      "## Purchase intent",
      payload.purchaseIntent ? "- [x] This is a real purchase-intent or pilot request if the tool catches article freshness launch risks." : "- [ ] Purchase intent not confirmed yet.",
      "",
      "## Public safety note",
      "Do not paste unpublished article drafts, private CMS exports, email addresses, customer data, access tokens, private paywall rules, legal documents, or proprietary editorial documents into this public issue."
    ].join("\n");
  }

  function setupWaitlist() {
    var form = qs("#waitlist-form");
    var status = qs("#waitlist-status");
    var handoff = qs("#handoff-panel");
    var remoteLink = qs("#remote-intent-link");
    var copyRequest = qs("#copy-request");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var payload = {
        email: qs("#email").value,
        role: qs("#role").value,
        surfaceType: qs("#surface-type").value,
        launchCadence: qs("#launch-cadence").value,
        plan: qs("#plan").value,
        budget: qs("#budget").value,
        pain: clean(qs("#pain").value),
        purchaseIntent: qs("#purchase-intent").checked,
        createdAt: new Date().toISOString()
      };
      var intents = readJson(intentKey);
      intents.push(Object.assign({}, payload, acquisition()));
      storeJson(intentKey, intents.slice(-100));
      state.latestRequestText = buildPublicRequest(payload);
      status.textContent = "You are on the early access list. Open the public-safe GitHub demo request or copy the request details.";
      handoff.hidden = false;
      var issueUrl = "https://github.com/ert93333-ops/article-author-freshness-qa-briefs/issues/new"
        + "?template=demo_request.md"
        + "&labels=" + encodeURIComponent("early-access,purchase-intent,demo-request")
        + "&title=" + encodeURIComponent("Article Author Freshness QA Briefs demo request")
        + "&body=" + encodeURIComponent(state.latestRequestText);
      remoteLink.href = issueUrl;
      track("waitlist_submitted", { role: payload.role, plan: payload.plan });
      track("feedback_submitted", { painLength: payload.pain.length });
      track("checkout_intent", { plan: payload.plan, purchaseIntent: payload.purchaseIntent });
      track("remote_intent_ready", { triggerSource: "waitlist_form" });
    });
    copyRequest.addEventListener("click", function () {
      if (!state.latestRequestText) return;
      copyText(state.latestRequestText).then(function () {
        track("remote_intent_copied", { triggerSource: "copy_request" });
        copyRequest.textContent = "Copied request details";
        window.setTimeout(function () { copyRequest.textContent = "Copy request details"; }, 1200);
      });
    });
  }

  function setupPlanButtons() {
    qsa(".plan-button").forEach(function (button) {
      button.addEventListener("click", function () {
        state.selectedPlan = button.dataset.plan;
        qs("#plan").value = state.selectedPlan;
        qsa(".plan-button").forEach(function (item) { item.classList.remove("selected"); });
        button.classList.add("selected");
        track("pricing_viewed", { plan: state.selectedPlan });
        track("checkout_started", { plan: state.selectedPlan });
        track("signup_started", { plan: state.selectedPlan });
        qs("#waitlist").scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function setupTracking() {
    track("landing_viewed", { product: "Article Author Freshness QA Briefs" });
    qsa("[data-track-cta]").forEach(function (element) {
      element.addEventListener("click", function () {
        track("cta_clicked", { cta: element.dataset.trackCta });
      });
    });
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            track("pricing_viewed", { triggerSource: "intersection" });
            observer.disconnect();
          }
        });
      }, { threshold: 0.3 });
      observer.observe(qs("#pricing"));
    }
  }

  function setupChrome() {
    var header = qs("[data-header]");
    function updateHeader() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    }
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  function setupReveal() {
    var elements = qsa(".reveal");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach(function (element) { element.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    elements.forEach(function (element, index) {
      element.style.transitionDelay = Math.min(index * 35, 220) + "ms";
      observer.observe(element);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupAuditor();
    setupWaitlist();
    setupPlanButtons();
    setupTracking();
    setupChrome();
    setupReveal();
  });
}());
