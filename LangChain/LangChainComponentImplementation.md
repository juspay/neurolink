### PromptTemplate

## String Prompt Template:

import {PromptTemplate} from "@langchain/core/prompts";
const prompt = PromptTemplatel.fromTemplate("Tell me a joke about {topic}");
const result = await prompt.invoke({topic} : "cats");
console.log(result);￼

## Chat Prompt Template:

￼
import {ChatPromptTemplate} from "@langchain/core/prompts";
const chatPrompt = ChatPromptTemplate.fromMessages([
["system", "You are a funny assistant"],
["human", "Tell me a joke about {topic}."]
]);
const chatResult = await chatPrompt.invoke({topic} : "cats");
console.log(chatResult);

### Chain

import {ChatGoogleGenerativeAI} from "@langchain/google-genai";
import {PromptTemplate} from "@langchain/core/prompts";
const llm = new ChatGoogleGenerativeAI({
model: "gemini-1.5-flash",
apiKey: "api key",
})

const prompt1 = PromptTemplate.fromTemplate("Give me 2 states in{country}");
const prompt2 = PromptTemplate.fromTemplate("Give me 2 places in {state}");
const chain1 = prompt1.pipe(llm);
const chain2 = prompt2.pipe(llm);
const res1 = await chain1.invoke({country: "India"});
const res2 = await chain2.invoke({state: res1.content};)
console.log("States: ",res1.content);
console.log("Places: ",res2.content);

### Vectorstores:

## Provide embedding model (After installing dependencies and setting credentials):

import {VertexAIEmbeddings} from "@langchain/google-vertexai";
const embeddings = new VertexAIEmbeddings({
model : "text-embeddings-004"
});
const vector = await embeddings.embed("I like chocolates");
console.log(vector.length);
￼

### Provide your vector store:

￼
import {MemoryVectorStore} from "langchain/vectorstores/memory";
const vectorstore = new MemoryVectoryStore(embeddings);

### Adding documents: To add documents, use the addDocuments method.

## After creating a vector store add documents:

import {Documents} from "@langchain/core/documents";
const document1 = new Document(
pageContent: "I like chocolates.";
metadata:{source: "tweet"},
)
const document2 = new Document(
pageContent: "The weather forecast for tomorrow is cloudy",
metadata: {source: "news"},
)
const documents = [document1, document2]
await vectorStore.addDocuments(documents)

### Similarity Check:

const query = "my query";
const docs = await vectorstore.similaritySearch(query);

### Text structured based splitting:

￼
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { Document } from "@langchain/core/documents";

const text = `Some other considerations include:

- Do you deploy your backend and frontend together, or separately?
- Do you deploy your backend co-located with your database, or separately?
  As you move your LangChains into production, we'd love to offer more hands-on support.
  Fill out [this form](https://airtable.com/appwQzlErAS2qiP0L/shrGtGaVBVAz7NcV2) to share more about what you're building, and our team will get in touch. See below for a list of deployment options for your LangChain app. If you don't see your preferred option, please get in touch and we can add it to this list.`;
  const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 50,
  chunkOverlap: 1,
  separators: ["|", "##", ">", "-"],
  });
  const docOutput = await splitter.splitDocuments([
  new Document({ pageContent: text }),
  ]);
  console.log(docOutput.slice(0, 3));

### Document Structured Splitting:

const JS_CODE = `function helloWorld() {
  console.log("Hello, World!");
}
helloWorld();`;
const jsSplitter = RecursiveCharacterTextSplitter.fromLanguage("js", {
chunkSize: 60,
chunkOverlap: 0,
});
const jsDocs = await jsSplitter.createDocuments([JS_CODE]);
jsDocs;
￼
