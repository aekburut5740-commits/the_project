import { NextResponse } from "next/server"

export async function GET() {
  const repo = process.env.GITHUB_REPO || "aekburut5740-commits/the_project"

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=10`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "the-project-app",
      },
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: "ไม่สามารถดึงข้อมูล GitHub ได้ในขณะนี้" },
        { status: response.status }
      )
    }

    const data = (await response.json()) as Array<{
      sha: string
      html_url: string
      commit: {
        message: string
        author: { name: string; date: string }
      }
      author?: {
        login?: string
      } | null
    }>

    const commits = data.map((item) => ({
      id: item.sha,
      message: item.commit.message.split("\n")[0],
      author: item.commit.author?.name || item.author?.login || "Unknown",
      date: item.commit.author?.date || "",
      url: item.html_url,
    }))

    return NextResponse.json({ repo, commits })
  } catch (error) {
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดขณะเชื่อมต่อ GitHub" },
      { status: 500 }
    )
  }
}
