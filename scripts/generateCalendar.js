const fs = require("fs-extra");
const fetch = require("node-fetch");

const USERNAME = "Wooltrod";
const REPO = "Hungarian_Self_Learning";

async function fetchContributions() {
  const query = `
    query {
      repository(name: "${REPO}", owner: "${USERNAME}") {
        defaultBranchRef {
          target {
            ... on Commit {
              history(first: 100) {
                edges {
                  node {
                    committedDate
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();
  const commits = json.data.repository.defaultBranchRef.target.history.edges;

  const dailyCounts = {};
  for (const commit of commits) {
    const date = commit.node.committedDate.slice(0, 10);
    dailyCounts[date] = (dailyCounts[date] || 0) + 1;
  }

  return dailyCounts;
}

async function generateSVG(data) {
  const { CalHeatmap } = await import("cal-heatmap");
  const { CalendarLegend } = await import("cal-heatmap/plugins/Legend");

  const cal = new CalHeatmap();
  await cal.paint({
    range: 6,
    data: {
      source: Object.entries(data).map(([date, value]) => ({ date, value })),
      x: "date",
      y: "value",
    },
    date: { start: new Date(Object.keys(data)[0]) },
    domain: { type: "month", gutter: 4 },
    subDomain: { type: "day" },
    scale: {
      color: {
        type: "quantize",
        domain: [0, 5],
        scheme: "Blues",
      },
    },
    plugins: [CalendarLegend],
  });

  const svg = cal.svg();
  await fs.outputFile("assets/contributions.svg", svg);
}

(async () => {
  const data = await fetchContributions();
  await generateSVG(data);
})();
