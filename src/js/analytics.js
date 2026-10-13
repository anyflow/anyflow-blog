(() => {
  const settings = document.currentScript?.dataset;
  const id = settings?.measurementId;
  if (!/^G-[A-Z0-9]+$/.test(id || '') || !settings.hostnames?.split(',').includes(location.hostname)) return;
  if (window.gtag || window.google_tag_manager || window.GoogleAnalyticsObject || window.ga ||
      document.querySelector('script[src*="googletagmanager.com/"],script[src*="google-analytics.com/"]')) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  // The GA4 config sends one page_view; do not also send a manual page_view.
  window.gtag('config', id);
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.append(tag);
})();
