import { j, publicProcedure } from "../jstack";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "hono/adapter";

const chatValidator = z.object({
  image: z.object({
    base64: z.string(),
  }),
  response: z.object({
    message: z.string(),
  }),
});

export const chatRouter = j.router({
  realTimeSession: j.procedure
    .incoming(chatValidator)
    .outgoing(chatValidator)
    .ws(({ c, io, ctx }) => ({
      async onConnect({ socket }) {
        socket.on("image", async (image) => {
          try {
            const google = createGoogleGenerativeAI({
              apiKey: String(env(c).GOOGLE_GENERATIVE_AI_API_KEY),
            });
            const { base64 } = image;
            console.log("Generating activity");
            const activity = await generateObject({
              model: google("gemini-2.0-flash-exp"),
              system:
                "Your task is to see screenshots from the user's screen and describe the activity they are doing. You need to get relevant information from the screenshot for another AI. This other AI will be given the description and context and will generate suggestions for the user.",
              schema: z.object({
                name: z
                  .string()
                  .describe(
                    "The name of the activity the person is doing. Including but no limited to: coding, writing, ..."
                  ),
                description: z
                  .string()
                  .describe(
                    "A more detailed description of the activity the person is doing."
                  ),
                context: z
                  .string()
                  .describe(
                    "Relevant information from the screenshot about the activity"
                  ),
              }),
              prompt: `Screenshot: ${base64}`,
            });
            console.log(activity);
            socket.emit("response", {
              message: activity.object.name,
            });
          } catch (error) {
            console.error(error);
            socket.emit("response", {
              message: "Error generating activity",
            });
          }
        });
      },
    })),
});
