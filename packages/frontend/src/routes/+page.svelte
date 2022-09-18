<script lang="ts">
    import "@master/css";
    import "@master/keyframes.css";
    import { fade } from "svelte/transition";
    import * as d3 from "d3";

    let session = "";
    let data: {
        id: number;
        name: string;
        users: { name: string; role: string; group: string; id: number }[];
    }[] = [];
    let selected: number[] = [];
    let most: { name: string; courses: number }[] = [];

    let fetching = false;
    async function get() {
        if (fetching) {
            return;
        }
        fetching = true;

        const response = await fetch(
            `${
                location?.hostname === "localhost" && !location.search.includes("remote")
                    ? "http://localhost:3000/get"
                    : "https://mui.jacoblin.cool/get"
            }?session=${session}`,
        );
        data = await response.json();
        fetching = false;
        console.log("fetched", data);
    }

    function update() {
        const students = new Map<number, { name: string; courses: number }>();
        data.flatMap((course) => (selected.includes(course.id) ? course.users : []))
            .filter((user) => user.role === "學生")
            .forEach((user) => {
                if (!students.has(user.id)) {
                    students.set(user.id, { name: user.name, courses: 0 });
                }
                students.get(user.id)!.courses++;
            });
        most = [...students.values()].sort((a, b) => b.courses - a.courses).slice(0, 11);

        const links: { source: number; target: number }[] = [];
        const nodes: { id: number; name: string; group: number }[] = [];

        const courses = new Map<number, { id: number; name: string; group: number }>();
        const users = new Map<number, { id: number; name: string; group: number }>();
        data.forEach((course) => {
            if (!selected.includes(course.id)) {
                return;
            }
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

        const width = 1600;
        const height = 1200;

        const svg = d3
            .select("#graph")
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
            .attr("stroke", "goldenrod");

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

<div class="w:full h:full flex flex:col">
    <div class="h:240 w:full">
        <h1 class="f:gold-80 p:8">Moodle User Intersection</h1>

        <div class="flex flex:row p:8">
            <input
                class="f:gold-80 w:172 p:8 b:1 outline:none b:gold-60:not(:focus) b:gold-80:focus bg:blue-8"
                type="text"
                bind:value={session}
                placeholder="輸入 Moodle Session"
            />
            <button
                class="f:gold-80 p:8 b:0 bg:blue-8 b:gold-80 b:1 b:gold-60:hover b:gold-80:hover cursor:pointer"
                on:click={get}
                disabled={fetching || session.length !== 26}
            >
                查詢
            </button>

            <br />

            {#if fetching}
                <div class="f:gold-80 p:8 @flash|1s|infinite" transition:fade>
                    查詢中，約需數十秒 ...
                </div>
            {/if}

            {#if data.length && !fetching}
                <div class="f:gold-80 p:8" transition:fade>查詢完成</div>
            {/if}
        </div>

        {#if data.length && !fetching}
            <div class="flex flex:row p:8">
                <select
                    class="f:gold-80 flex:1 h:60 p:8 b:1 outline:none b:gold-60:not(:focus) b:gold-80:focus bg:blue-8"
                    multiple
                    bind:value={selected}
                >
                    {#each data as course}
                        <option value={course.id} selected>{course.name}</option>
                    {/each}
                </select>

                <button
                    class="f:gold-80 w:80 p:8 b:0 bg:blue-8 b:gold-80 b:1 b:gold-60:hover b:gold-80:hover cursor:pointer"
                    on:click={update}
                >
                    繪製
                </button>
            </div>
        {/if}
    </div>
    <div class="flex:1 w:full">
        <div class="w:full p:8">
            {#if most.length}
                <h1 class="f:gold-80">誰是你的修課好夥伴？</h1>
            {/if}
            {#each most as user, idx}
                <div class="f:gold-80 p:8">
                    {idx}. {user.name} ({user.courses} 堂共同課程)
                </div>
            {/each}
        </div>
        <div class="h:full w:full">
            <svg id="graph" class="w:full h:full" />
        </div>
    </div>
</div>
