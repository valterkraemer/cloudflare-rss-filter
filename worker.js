addEventListener("fetch", (event) => {
  event.respondWith(
    handleRequest(event.request).catch(
      (err) => new Response(err.stack, { status: 500 })
    )
  );
});

async function handleRequest(request) {
  const { searchParams } = new URL(request.url);

  const targetUrl = new URL(searchParams.get("url"));
  const removeCategories = searchParams.getAll("!category");

  const res = await fetch(targetUrl, {
    headers: {
      accept: "application/rss+xml",
    },
  });

  let filter = false;

  const rewriter = new HTMLRewriter()
    .on("item", {
      element(element) {
        filter = false;

        element.onEndTag((endElement) => {
          if (filter) {
            endElement.before(`---REMOVE-THIS-ITEM---`);
          }
        });
      },
    })
    .on("category", {
      element(element) {
        category = "";

        element.onEndTag(() => {
          if (removeCategories.includes(category)) {
            filter = true;
          }
        });
      },
      text(text) {
        category += text.text;
      },
    })
    .transform(res);

  const text = await rewriter.text();

  const cleaned = text.replace(
    /<item>((?!<\/item>).)*---REMOVE-THIS-ITEM---<\/item>/g,
    ""
  );

  return new Response(cleaned, {
    headers: new Headers({
      "Content-Type": "text/xml",
      charset: "utf-8",
    }),
  });
}
