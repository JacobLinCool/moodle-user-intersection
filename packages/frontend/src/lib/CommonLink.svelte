<script lang="ts">
    import * as d3 from "d3";

    export let data: {
        id: number;
        name: string;
        users: { name: string; role: string; group: string; id: number }[];
    }[] = [];

    $: {
        const links: { source: number; target: number; courses: number[] }[] = [];
        const nodes: { id: number; name: string; courses: number[] }[] = [];

        const courses = new Map<number, { id: number; name: string }>();
        const users = new Map<number, { id: number; name: string; courses: number[] }>();
        data.forEach((course) => {
            courses.set(course.id, { id: course.id, name: course.name });
            course.users.forEach((user) => {
                if (!users.has(user.id)) {
                    users.set(user.id, { id: user.id, name: user.name, courses: [] });
                }
                const u = users.get(user.id);
                if (u) {
                    u.courses.push(course.id);
                }
            });
        });

        if (users.size > 1) {
            const [self, ...others] = [...users.values()].sort(
                (a, b) => b.courses.length - a.courses.length,
            );

            nodes.push(self, ...others);

            for (let i = 0; i < others.length; i++) {
                links.push({ source: self.id, target: others[i].id, courses: others[i].courses });
            }

            console.log(links, nodes);

            const width = 1600;
            const height = 1200;

            const svg = d3
                .select("#common-link-graph")
                .attr("viewBox", [-width / 2, -height / 2, width, height])
                .style("font", "12px sans-serif");

            svg.selectAll("*").remove();

            const box = d3
                .select("#common-link-box")
                .style("display", "none")
                .style("pointer-events", "none");

            const simulation = d3
                // @ts-ignore
                .forceSimulation(nodes)
                .force(
                    "link",
                    d3
                        .forceLink(links)
                        // @ts-ignore
                        .id((node) => node.id),
                )
                .force(
                    "charge",
                    d3
                        .forceManyBody()
                        .distanceMin(100)
                        .strength(
                            // @ts-ignore
                            (node) => -800 + (node.courses.length / self.courses.length) * 600,
                        ),
                )
                .force("x", d3.forceX())
                .force("y", d3.forceY());

            const link = svg
                .append("g")
                .attr("fill", "none")
                .selectAll("path")
                .data(links)
                .join("path")
                .attr("stroke-width", (link) => Math.sqrt(link.courses.length))
                .style("opacity", (link) => (link.courses.length / self.courses.length) * 0.7 + 0.3)
                .attr("stroke", "goldenrod");

            const node = svg
                .append("g")
                .attr("stroke-linecap", "round")
                .attr("stroke-linejoin", "round")
                .selectAll("g")
                .data(nodes)
                .join("g")
                .call(drag(simulation))
                .on("mouseover", (event, node) => {
                    box.html(
                        `
                        <div>${node.name}</div>
                        <div>
                            ${node.courses
                                .map((id) => "- " + courses.get(id)?.name)
                                .filter((name) => name)
                                .join("<br />")}
                        </div>
                    `,
                    )
                        .style("display", "block")
                        .style("left", `${event.pageX + 10}px`)
                        .style("top", `${event.pageY + 10}px`);
                })
                .on("mouseout", (event, node) => {
                    box.style("display", "none");
                });

            node.append("circle")
                .attr("stroke", "white")
                .attr(
                    "fill",
                    (node) => `hsl(${(node.courses.length / self.courses.length) * 360}, 70%, 50%)`,
                )
                .attr("stroke-width", 1)
                .attr("r", 4);

            node.append("text")
                .attr("x", 8)
                .attr("y", "0.31em")
                .text((node) => node.name)
                .style(
                    "font-size",
                    (node) => `${(node.courses.length / self.courses.length) * 8 + 6}px`,
                )
                .style("pointer-events", "none")
                .attr("fill", "white");

            simulation.on("tick", () => {
                // @ts-ignore
                link.attr("d", arc);
                // @ts-ignore
                node.attr("transform", (node) => `translate(${node.x},${node.y})`);
            });
        }
    }

    function drag(simulation: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
        function dragstarted(
            event: d3.D3DragEvent<SVGElement, d3.SimulationNodeDatum, undefined>,
            node: d3.SimulationNodeDatum,
        ) {
            if (!event.active) {
                simulation.alphaTarget(0.3).restart();
            }
            node.fx = node.x;
            node.fy = node.y;
        }

        function dragged(
            event: d3.D3DragEvent<SVGElement, d3.SimulationNodeDatum, undefined>,
            node: d3.SimulationNodeDatum,
        ) {
            node.fx = event.x;
            node.fy = event.y;
        }

        function dragended(
            event: d3.D3DragEvent<SVGElement, d3.SimulationNodeDatum, undefined>,
            node: d3.SimulationNodeDatum,
        ) {
            if (!event.active) {
                simulation.alphaTarget(0);
            }
            node.fx = null;
            node.fy = null;
        }

        // @ts-ignore
        return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }

    function arc(link: d3.SimulationLinkDatum<d3.SimulationNodeDatum>) {
        const r = 0;
        // @ts-ignore
        return `M${link.source.x},${link.source.y} A${r},${r} 0 0,1 ${link.target.x},${link.target.y}`;
    }
</script>

<svg id="common-link-graph" class="my:16 b:1|solid|gold-80 r:4" />
<div
    id="common-link-box"
    class="abs hidden bg:blue-8 f:gold-80 b:1|solid|gold-80 p:10 r:4 z-index:1000 opacity:0.9"
/>
