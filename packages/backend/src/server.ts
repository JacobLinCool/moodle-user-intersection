import fs from "node:fs";
import path from "node:path";
import { Browser, chromium, Page, Response } from "playwright-core";
import express from "express";
import ora from "ora";
import chalk from "chalk";
import { RateLimiter } from "./rate-limiter";
import { find_chrome } from "./find-chrome";

const ENABLE_CACHE = process.env.ENABLE_CACHE === "true";
const ENABLE_MEM_CACHE = process.env.ENABLE_MEM_CACHE === "true";
const MEM_CACHE = new Map<string, { id: number; name: string; users: User[] }[]>();

const browser: Browser = await chromium.launch({ executablePath: find_chrome() });
process.on("SIGINT", async () => {
    await browser.close();
    process.exit(0);
});

const limiter = new RateLimiter({ concurrent: 4, interval: 1000, limit: 4 });
const server = express().use(express.json());

const cache_dir = path.resolve("cache");
if (!fs.existsSync(cache_dir)) {
    fs.mkdirSync(cache_dir, { recursive: true });
}
server.use("/cache", express.static(cache_dir));

server.get("/get", async (req, res) => {
    const { session } = req.query;
    if (typeof session !== "string") {
        res.status(400).send("Missing session");
        return;
    }

    try {
        const result =
            ENABLE_MEM_CACHE && MEM_CACHE.has(session)
                ? MEM_CACHE.get(session)
                : await get({ session, base: "https://moodle3.ntnu.edu.tw" });
        res.header("Access-Control-Allow-Origin", "*").json(result);

        if (ENABLE_MEM_CACHE && !MEM_CACHE.has(session) && result) {
            MEM_CACHE.set(session, result);
        }
    } catch (err) {
        res.status(500).send((err as Error).message);
    }
});

server.listen(3000, () => {
    console.log(chalk.green("Server started at http://localhost:3000"));
});

async function get(opt: Options): Promise<{ id: number; name: string; users: User[] }[]> {
    if (!opt.session) {
        throw new Error("Missing session");
    }

    const spinner = ora(
        `Fetching data for ${opt.session.replace(/^(.{4}).*(.{4})$/, "$1***$2")}`,
    ).start();
    try {
        const context = await browser.newContext();
        await context.addCookies([
            {
                name: "MoodleSession",
                value: opt.session,
                domain: new URL(opt.base).hostname,
                path: "/",
            },
        ]);

        const page = await context.newPage();
        const courses = (await get_courses(page, opt)).sort((a, b) => b.id - a.id);
        if (courses.length === 0) {
            throw new Error("No courses found");
        }
        spinner.succeed(`Found ${courses.length} courses`);

        const result: { id: number; name: string; users: User[] }[] = [];

        await Promise.all(
            courses.map(async (course) => {
                const page = await context.newPage();
                const users = await get_users(page, course.id, opt);
                page.close();
                result.push({ id: course.id, name: course.title, users });
                spinner.succeed(`Found ${users.length} users in ${course.title}`);
            }),
        );

        await context.close();
        spinner.succeed(`Fetched data for ${opt.session.replace(/^(.{4}).*(.{4})$/, "$1***$2")}`);
        return result;
    } catch (err) {
        spinner.fail((err as Error).message);
        throw err;
    }
}

function get_courses(page: Page, opt: Options): Promise<{ title: string; id: number }[]> {
    let resolved = false;

    return new Promise((resolve) => {
        const listener = async (res: Response) => {
            if (res.url().includes("core_course_get_enrolled_courses_by_timeline_classification")) {
                const json = await res.json();
                resolved = true;
                resolve(
                    json[0].data.courses.map((course: any) => ({
                        title: course.fullname,
                        id: course.id,
                    })),
                );

                page.off("response", listener);
            }
        };
        page.on("response", listener);
        page.goto(`${opt.base}/my`);

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve([]);
                page.off("response", listener);
            }
        }, 15_000);
    });
}

async function get_users(page: Page, course_id: number, opt: Options): Promise<User[]> {
    if (ENABLE_CACHE && fs.existsSync(path.join(cache_dir, `${course_id}.json`))) {
        return JSON.parse(fs.readFileSync(path.join(cache_dir, `${course_id}.json`), "utf-8"));
    }

    await limiter.lock();

    try {
        await page.goto(`${opt.base}/user/index.php?id=${course_id}&perpage=5000`);

        const rows = await page.$$("#participants > tbody > tr:not(.emptyrow)");

        const users = (
            await Promise.all(
                rows.map(async (row) => {
                    try {
                        const name =
                            (await row.$eval("td:nth-child(1) > a", (a: HTMLAnchorElement) =>
                                a.textContent?.trim(),
                            )) || "";
                        const role =
                            (await row.$eval("td:nth-child(2)", (td: HTMLTableCellElement) =>
                                td.textContent?.trim(),
                            )) || "";
                        const group =
                            (await row.$eval("td:nth-child(3)", (td: HTMLTableCellElement) =>
                                td.textContent?.trim(),
                            )) || "";
                        const id = await row.$eval("td:nth-child(1) > a", (a: HTMLAnchorElement) =>
                            Number(a.href.match(/id=(\d+)/)?.[1]),
                        );
                        return { name, role, group, id };
                    } catch (err) {
                        return { name: "", role: "", group: "", id: 0 };
                    }
                }),
            )
        ).filter((user) => user.id !== 0);

        fs.writeFileSync(path.join(cache_dir, `${course_id}.json`), JSON.stringify(users, null, 2));

        limiter.unlock();
        return users;
    } catch (err) {
        limiter.unlock();
        throw err;
    }
}

interface Options {
    session: string;
    base: string;
}

interface User {
    name: string;
    role: string;
    group: string;
    id: number;
}
