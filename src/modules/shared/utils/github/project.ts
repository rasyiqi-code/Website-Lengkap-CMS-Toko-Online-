export interface RoadmapItem {
    title: string;
    body: string;
    status: string; // "Todo", "In Progress", "Done"
}

export async function fetchRoadmapData(): Promise<RoadmapItem[] | null> {
    const token = process.env.GITHUB_PAT;
    if (!token) {
        console.warn("[GITHUB] GITHUB_PAT is not set. Falling back to static data.");
        return null;
    }

    const query = `
    query {
      organization(login: "crediblemark-official") {
        projectV2(number: 1) {
          title
          items(first: 100) {
            nodes {
              content {
                ... on DraftIssue {
                  title
                  body
                }
                ... on Issue {
                  title
                  body
                }
              }
              fieldValues(first: 10) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2FieldCommon {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`;

    try {
        const response = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: {
                "Authorization": `bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query }),
            next: { revalidate: 3600 } // Cache for 1 hour
        });

        const json = await response.json();
        
        if (json.errors) {
            console.error("[GITHUB] GraphQL Errors:", json.errors);
            return null;
        }

        const nodes = json.data?.organization?.projectV2?.items?.nodes || [];
        
        const items: RoadmapItem[] = nodes
            .filter((node: any) => node.content?.title) // Buang item tanpa judul (PR merged tanpa DraftIssue/Issue)
            .map((node: any) => {
                let status = "Todo";
                // Cari nilai field Status
                const fieldValues = node.fieldValues?.nodes || [];
                for (const fv of fieldValues) {
                    if (fv.field?.name === "Status" && fv.name) {
                        status = fv.name;
                        break;
                    }
                }

                return {
                    title: node.content.title,
                    body: node.content.body || "",
                    status
                };
            });

        return items.length > 0 ? items : null;
    } catch (error) {
        console.error("[GITHUB] Error fetching project data:", error);
        return null;
    }
}
