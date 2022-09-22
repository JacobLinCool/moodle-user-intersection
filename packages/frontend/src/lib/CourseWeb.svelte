<script lang="ts">
    import * as d3 from "d3";

    export let data: {
        id: number;
        name: string;
        users: { name: string; role: string; group: string; id: number }[];
    }[] = [];

    $: {
        const links: { source: number; target: number }[] = [];
        const nodes: { id: number; name: string; group: number }[] = [];

        const courses = new Map<number, { id: number; name: string; group: number }>();
        const users = new Map<number, { id: number; name: string; group: number }>();
        data.forEach((course) => {
            courses.set(course.id, { id: course.id, name: course.name, group: 0 });
            course.users.forEach((user) => {
                if (!users.has(user.id)) {
                    users.set(user.id, { id: user.id, name: user.name, group: 0 });
                }
                const u = users.get(user.id);
                if (u) {
                    u.group++;
                }
                links.push({ source: user.id, target: course.id });
            });
        });

        users.forEach((user) => nodes.push(user));
        courses.forEach((course) => nodes.push(course));

        console.log(links, nodes);

        const width = 1600;
        const height = 1200;

        const svg = d3
            .select("#course-web-graph")
            .attr("viewBox", [-width / 2, -height / 2, width, height])
            .style("font", "12px sans-serif");

        svg.selectAll("*").remove();

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
            .force("charge", d3.forceManyBody().distanceMin(20).distanceMax(320).strength(-300))
            .force("x", d3.forceX())
            .force("y", d3.forceY());

        const link = svg
            .append("g")
            .attr("fill", "none")
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(links)
            .join("path")
            .attr("stroke", "goldenrod")
            .style("opacity", 0.7);

        const node = svg
            .append("g")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(drag(simulation));

        node.append("circle")
            .attr("stroke", "white")
            .attr("fill", (node) => `hsl(${node.group * 30}, 70%, 50%)`)
            .attr("stroke-width", 1)
            .attr("r", 4);

        node.append("text")
            .attr("x", 8)
            .attr("y", "0.31em")
            .text((node) => node.name)
            .style("font-size", (node) => (node.group > 0 ? "8px" : "14px"))
            .style("pointer-events", "none")
            .attr("fill", (node) => (node.group > 0 ? "white" : "red"))
            .attr("stroke", (node) => (node.group > 0 ? "none" : "pink"))
            .attr("stroke-width", 0.5);

        simulation.on("tick", () => {
            // @ts-ignore
            link.attr("d", arc);
            // @ts-ignore
            node.attr("transform", (node) => `translate(${node.x},${node.y})`);
        });
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
        // @ts-ignore
        const r = Math.hypot(link.target.x - link.source.x, link.target.y - link.source.y);
        // @ts-ignore
        return `M${link.source.x},${link.source.y} A${r},${r} 0 0,1 ${link.target.x},${link.target.y}`;
    }
</script>

<svg id="course-web-graph" class="my:16 b:1|solid|gold-80 r:4" />
