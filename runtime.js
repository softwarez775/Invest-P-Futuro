(function () {
  var s = document.createElement("style");
  s.textContent =
    "html,body{overflow-x:hidden;max-width:100%}.post-section,.post-container,.post-body,.post-body .w-richtext{max-width:100%;box-sizing:border-box}.post-body a,.compliance-content a,.author-bio-text a{color:#E6CB74!important;text-decoration:underline;text-underline-offset:3px;word-break:break-word}.post-body h2{font-size:32px;font-weight:600;margin:64px 0 24px;color:#F4F4EE}.post-body h3{font-size:22px;font-weight:500;margin:40px 0 16px;color:#F4F4EE}.post-body p{margin:0 0 24px;color:#EBEDD2}.post-body strong{color:#F4F4EE;font-weight:600}.post-body ul,.post-body ol{margin:0 0 24px 24px}.post-body li{margin-bottom:12px;color:#EBEDD2}.post-body table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%;border-collapse:collapse;margin:32px 0;font-size:15px}.post-body th{background:rgba(230,203,116,.06);border-bottom:1px solid rgba(230,203,116,.3);padding:16px 12px;text-align:left;color:#E6CB74;font-weight:600;min-width:140px}.post-body td{border-bottom:1px solid #212121;padding:14px 12px;vertical-align:top;color:#EBEDD2;min-width:140px}.post-body blockquote{border-left:3px solid #E6CB74;background:rgba(158,137,69,.05);margin:32px 0;padding:24px 28px;color:#BABABA}.post-body blockquote p{margin:0;color:#BABABA}@media(max-width:767px){.post-body{font-size:16px}.post-body table{font-size:13px}.post-body th,.post-body td{padding:10px 8px;min-width:120px}.post-body h2{font-size:24px;margin:48px 0 20px}.post-body h3{font-size:18px;margin:32px 0 12px}}";
  document.head.appendChild(s);
  function r() {
    [".jsonld-article-data", ".jsonld-faq-data", ".jsonld-breadcrumb-data"].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el && el.textContent && el.textContent.trim().length > 10) {
        var sc = document.createElement("script");
        sc.type = "application/ld+json";
        sc.textContent = el.textContent.trim();
        document.head.appendChild(sc);
      }
    });
    document.querySelectorAll(".w-dyn-item").forEach(function (it) {
      var sl = it.querySelector(".blog-card-slug");
      var ln = it.querySelector(".blog-card-link");
      if (sl && ln) {
        var s = sl.textContent.trim();
        if (s) ln.setAttribute("href", "/blog/" + s);
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", r);
  } else {
    r();
  }
})();
