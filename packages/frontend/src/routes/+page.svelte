<script lang="ts">
    import "@master/css";
    import "@master/keyframes.css";
    import { fade } from "svelte/transition";
    import CourseWeb from "$lib/CourseWeb.svelte";
    import CommonLink from "$lib/CommonLink.svelte";

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
        data.sort((a, b) => b.id - a.id);
        fetching = false;
        console.log("fetched", data);
    }

    $: {
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
    }
</script>

<div class="w:full h:full flex flex:col">
    <div class="h:320 w:full">
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
            <div class="flex flex:col p:8">
                <label for="courses-select" class="f:gold-80 p:8">選擇分析課程（多選）</label>
                <select
                    id="courses-select"
                    class="f:gold-80 flex:1 h:60 p:8 b:1 outline:none b:gold-60:not(:focus) b:gold-80:focus bg:blue-8"
                    multiple
                    bind:value={selected}
                >
                    {#each data as course}
                        <option value={course.id} selected>{course.name}</option>
                    {/each}
                </select>
            </div>
        {/if}
    </div>
    {#if data.length > 0}
        <div class="flex:1 w:full">
            <div class="m:8">
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
            <div class="w:full">
                <CommonLink data={data.filter((d) => selected.includes(d.id))} />
            </div>
                <CourseWeb data={data.filter((d) => selected.includes(d.id))} />
            </div>
        </div>
    {/if}
</div>
