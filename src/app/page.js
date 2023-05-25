"use client"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { nightOwl } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useLocalStorage } from "@/Hooks/useLocalStorage"

const ChatbotApp = () => {
  const [chatThread, setChatThread] = useState([])
  const [prompt, setPrompt] = useState("");
  const [system, setSystem] = useState("")
  const [gptResponse, setGPTResponse] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false)
  const [currentID, setCurrentId] = useState(false)
  const [chatIds, setChatIds] = useState([])



  const messageThreadContainer = useRef(null)

  const systemIns = { role: "system", content: system }
  const currentQuery = { role: 'user', content: prompt }



  useEffect(() => {
    document.scrollingElement.scroll(0, 1);

    let chat = false
    try {
      if (currentID) {
        chat = window.localStorage.getItem(currentID?.id);
      }
    } catch (error) {
      console.log(error);
    }
    if (chat) {
      setSystem(currentID?.content)
      setChatThread(JSON.parse(chat))
    } else {
      setChatThread([])
      setSystem('')
    }
  }, [currentID])


  useEffect(() => {
    let idsFromLocalStorage = false
    try {
      idsFromLocalStorage = window.localStorage.getItem('chatIds')
    } catch (e) {
      console.log(e)
    }

    if (idsFromLocalStorage) {
      setChatIds(JSON.parse(idsFromLocalStorage))
    }

  }, [])

  useEffect(() => {
    setChatIds(ids => ids.map(idset => {
      if (currentID?.id === idset.id) {
        return { ...idset, ...systemIns }
      } else {
        return { ...idset }
      }
    }))

  }, [currentID, system])

  useEffect(() => {
    if (chatIds.length !== 0) {
      window.localStorage.setItem('chatIds', JSON.stringify(chatIds))
    }
  }, [chatIds])





  useEffect(() => {
    if (!loading && chatThread.length != 0 && chatThread[chatThread.length - 1]?.role !== 'assistant' && gptResponse !== '') {
      const thread = [...chatThread, { role: 'assistant', content: gptResponse }]
      window.localStorage.setItem(currentID?.id, JSON.stringify(thread))
      setChatThread(thread)
      setGPTResponse(false)

    }

  }, [loading, chatThread, gptResponse])


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false)

    let messageThread = [...chatThread]

    messageThread = [...messageThread, currentQuery]
    let chatThreadToSend = [systemIns, ...messageThread]

    window.localStorage.setItem(currentID?.id, JSON.stringify(messageThread))

    setChatThread(messageThread)

    setGPTResponse('')
    setPrompt('')

    try {


      const result = await fetch(process.env.NEXT_PUBLIC_OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPEN_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: chatThreadToSend,
          temperature: 0.7,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
          max_tokens: 2000,
          stream: true,
          n: 1,
        }),
      });

      const reader = result.body.getReader();
      let fullRes = ''

      const decoder = new TextDecoder("utf-8")

      while (true) {

        const { value, done } = await reader.read();

        if (done) {
          console.log("The stream was already closed!");
          // console.log(decoder.decode(value))
          break
        }
        const decodedChunk = decoder.decode(value)
        fullRes += decodedChunk
        const lines = decodedChunk.split("\n")
        const parsedLines = lines
          .map(line => line.replace(/^data: /, "").trim())
          .filter(line => line != "" && line != '[DONE]')
          .map(line => JSON.parse(line))
        // console.log(parsedLines);

        for (const parsedLine of parsedLines) {
          const { choices } = parsedLine;
          const { delta } = choices[0]
          const { content } = delta
          if (content) {
            setGPTResponse(e => e + content)
            if (messageThreadContainer.current) {
              messageThreadContainer.current.scrollTop = messageThreadContainer.current.scrollHeight
            }
            fullRes += content
            console.log(content)
          }
        }
      }
      // if (fullRes !== '') {
      //   setChatThread((prevThread) => [...prevThread, { role: 'assistant', content: fullRes }])
      // }


    } catch (e) {
      //console.log(e);
      setError("Something went wrong, please try again")
      setGPTResponse("");
    }
    console.log("gpt response", gptResponse)
    setLoading(false);
  };

  function initiateNewChat() {
    const newId = crypto.randomUUID()
    const newChatids = [{ id: newId, ...systemIns }, ...chatIds]
    window.localStorage.setItem('chatIds', newChatids)
    setCurrentId({ id: newId, ...systemIns })
    setChatIds(newChatids)
  }

  return (
    <>
      <div className="grid w-full h-screen grid-cols-12 px-2 text-sm py-7">
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-3">
            <label>System Prompt</label>
            <button
              className="inline-flex items-center px-4 py-2 font-normal text-white rounded bg-slate-900 hover:bg-slate-600"
              onClick={initiateNewChat}
            >
              New Chat
            </button>
          </div>
          <textarea
            className="block w-full h-36 max-h-36 rounded-md border-0 p-1.5 bg-slate-50 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:text-sm sm:leading-6"
            type="text"
            value={system}
            placeholder="Please add System message"
            onChange={(e) => setSystem(e.target.value)}
          >
          </textarea>
          <label className="block mt-2">Chats</label>
          <div className="flex flex-col gap-2 py-2">

            {chatIds.map(chatId => <button
              onClick={() => setCurrentId(chatId)}
              className="block p-1.5 w-full bg-slate-100 hover:bg-slate-400 transition-colors text-ellipsis truncate rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:text-sm sm:leading-6"
            >
              {chatId?.content}
              <br />
              {chatId?.id}
            </button>)}
          </div>
        </div>


        <div
          className="flex flex-col justify-start col-span-9 ml-3"
        >


          <div ref={messageThreadContainer} style={{ overflowAnchor: 'none' }} className="h-full overflow-y-scroll max-h-[75vh]">
            <div className="flex flex-col gap-1.5">
              {chatThread.map(chat => <div className={`${chat?.role === 'assistant' ? 'bg-slate-300' : 'bg-slate-100'} p-2 rounded-md`}><span className="font-bold capitalize">{chat?.role}: </span>
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <SyntaxHighlighter
                          {...props}
                          children={String(children).replace(/\n$/, '')}
                          style={nightOwl}
                          language={match[1]}
                          PreTag="div"
                        />
                      ) : (
                        <code {...props} className={className}>
                          {children}
                        </code>
                      )
                    }
                  }}
                  remarkPlugins={[remarkGfm]}>
                  {chat?.content}
                </ReactMarkdown>
              </div>)}
            </div>
            {gptResponse && (
              <div
                className={` mt-1.5 bg-slate-300  p-2 rounded-md`}
              >

                <span className={`font-bold capitalize ${loading ? 'animate-pulse' : ''}`}>assistant: </span>
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <SyntaxHighlighter
                          {...props}
                          children={String(children).replace(/\n$/, '')}
                          style={nightOwl}
                          language={match[1]}
                          PreTag="div"
                        />
                      ) : (
                        <code {...props} className={className}>
                          {children}
                        </code>
                      )
                    }
                  }}
                  remarkPlugins={[remarkGfm]}>
                  {gptResponse}
                </ReactMarkdown>

              </div>
            )}
            {error && (
              <div
                className=""
              >

                <strong>API response:</strong>
                {error}

              </div>
            )}
            <div style={{ overflowAnchor: 'auto', height: '1px' }}></div>
          </div>
          <form className="mt-auto" onSubmit={handleSubmit}>
            <textarea
              className="block w-full rounded-md  border-0 p-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-slate-900 sm:text-sm sm:leading-6"
              type="text"
              value={prompt}
              placeholder="Please ask openai"
              onChange={(e) => setPrompt(e.target.value)}
            >
            </textarea>
            <button
              className="inline-flex items-center px-4 py-2 mt-2 font-normal text-white rounded bg-slate-900 hover:bg-slate-600"
              disabled={loading || prompt.length === 0}
              type="submit"
            >
              {loading ? "Generating..." : "Ask GPT"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};


export default ChatbotApp;