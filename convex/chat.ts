import { internalAction, mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { api, internal } from "./_generated/api"

export const sendMessage = mutation({
  args: {
    user: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      user: args.user,
      body: args.body,
    })
    if (args.body.startsWith("/wiki")) {
      const topic = args.body.slice(args.body.indexOf(" ") + 1)
      await ctx.scheduler.runAfter(0, internal.chat.getWikipediaSummary, {
        topic,
      })
    }
  },
})

export const getMessages = query({
  args: {},
  handler: async ctx => {
    const messages = await ctx.db.query("messages").order("desc").take(50)
    return messages.reverse()
  },
})

export const getWikipediaSummary = internalAction({
  args: { topic: v.string() },
  handler: async (ctx, args) => {
    const respone = await fetch(
      `https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${args.topic}`
    )
    const summary = getSummaryFromJSON(await respone.json())
    await ctx.scheduler.runAfter(0, api.chat.sendMessage, {
      user: "Wikipedia",
      body: summary,
    })
  },
})

function getSummaryFromJSON(data: any) {
  const firstPageId = Object.keys(data.query.pages)[0]
  return data.query.pages[firstPageId].extract
}
