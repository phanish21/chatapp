import { useContext, useEffect, useRef, useState } from "react"
import Avatar from "./Avatar";
import Logo from "./Logo";
import {uniqBy} from 'lodash';
import { UserContext } from "./UserContext";
import axios from "axios";
import Contact from "../Contact";

export default function Chat() {
    const [ws , setWs] = useState(null);
    const [onlinePeople , setOnlinePeople] = useState({});
    const [selectedUserId , setSelectedUserId] = useState(null);
    const [newMessageText , setNewMessageText] = useState('');
    const [messages , setMessages] = useState([]);
    const {username , id , setId , setUsername} = useContext(UserContext);
    const [offlinePeople , setOfflinePeople] = useState({});
    const divUnderMessages = useRef();
    useEffect(() => {
        connectToWs();
    }, []);

    function connectToWs() {
        const ws = new WebSocket('ws://localhost:4040');
        setWs(ws);
        ws.addEventListener('message' , handleMessage );
        ws.addEventListener('close' , () => {
        setTimeout(() => {
            console.log('trying to reconnect');
            connectToWs();
        }, 1000); 
    });
    }
    function showOnlinePeople(peopleArray) {
        const people = {}
        peopleArray.forEach(({userId , username}) => {
            people[userId] = username;
        });
        setOnlinePeople(people);
    }

    function handleMessage(ev) {
        const messageData = JSON.parse(ev.data);
        if ('online' in messageData) {
            showOnlinePeople(messageData.online);
        } else if( 'text' in messageData) {
            if (messageData.sender === selectedUserId) {
                setMessages(prev => ([...prev , {...messageData}]));
            }
        }
    }

    function logout() {
        axios.post('/logout').then(() =>{
            setWs(null);
            setId(null);
            setUsername(null);
        });
    }

    function sendMessage(ev , file = null ) {
        if (ev) ev.preventDefault();
        ws.send(JSON.stringify({
                recipient : selectedUserId,
                text: newMessageText,
                file,
        }));
        if (file) {
            axios.get('/messages/'+selectedUserId).then(res => {
                setMessages(res.data);
            }); 
        } else {
            setNewMessageText('');
            setMessages(prev => ([...prev ,{
            text:newMessageText , 
            sender: id,
            recipient: selectedUserId,
            _id: Date.now(),
        }]));
        }
         
    }
    function sendFile(ev) {
        const reader = new FileReader();
        reader.readAsDataURL(ev.target.files[0]);
        reader.onload = () => {
            sendMessage(null , {
                name: ev.target.files[0].name,
                data: reader.result,
            });
        }
    }

    useEffect(()=>{
        const div = divUnderMessages.current;
        if (div) {
            div.scrollIntoView({ behaviour:'smooth' , block:'end'})
        }
    }, [messages]);
    
    useEffect(() => {
        axios.get('/people').then(res => {
            const offlinePeopleArr = res.data
            .filter(p => p._id !== id)
            .filter(p => !Object.keys(onlinePeople).includes(p._id));
            const offlinePeople = {};
            offlinePeopleArr.forEach(p => {
                offlinePeople[p._id] = p
            })
            setOfflinePeople(offlinePeople);
        });
    } , [onlinePeople]);

    useEffect(() => {
        if (selectedUserId) {
            axios.get('/messages/'+selectedUserId).then(res => {
                setMessages(res.data);
            });
        }
    }, [selectedUserId]);

    const onlinePeopleExclOurUser = {...onlinePeople};
    delete onlinePeopleExclOurUser[id];

    const messageWithoutDupes = uniqBy(messages , '_id');
    return (
        <div className="flex h-screen p-20">
            <div className=" flex flex-col p-pink w-1/3">
                <div className="flex-grow">
                <Logo />
                {Object.keys(onlinePeopleExclOurUser).map(userId =>(
                    <Contact
                    id={userId} 
                    online={true}
                    username={onlinePeopleExclOurUser[userId]} 
                    onClick={() => setSelectedUserId(userId)} 
                    selected = {userId === selectedUserId}
                    />
                ))}
                {Object.keys(offlinePeople).map(userId =>(
                    <Contact 
                    id={userId} 
                    online={false}
                    username={offlinePeople[userId].username} 
                    onClick={() => setSelectedUserId(userId)} 
                    selected = {userId === selectedUserId}
                    />
                ))}
                </div>
                <div className="flex flex-row gap-2 p-2 bg-red-500">
                    <div className=" flex flex-grow mt-1 items-center ">
                    <Avatar online={true} username={username} userId = {id} />
                    <span className=" text-lg gap-2 mt-0 p-1">
                        {username}
                    </span>
                    </div>
                    <button onClick={logout}
                     className=" p-2 rounded-xl bg-red-400 text-white">
                        Logout
                    </button>
                </div>
            </div>
            <div className="flex flex-col bg-pink-500 w-2/3 p-2">
                <div className="flex-grow">
                    {!selectedUserId && (
                        <div className=" flex h-full flex-grow items-center justify-center">
                            <div className=" text-xl text-pink-300">
                            select a person
                            </div>
                        </div>
                    )}
                    {!!selectedUserId && (
                        <div className=" relative h-full">
                            <div className=" overflow-y-scroll absolute right-0 left-0 top-0 bottom-2">
                                {messageWithoutDupes.map( message => (
                                    <div  className={ (message.sender === id ? 'text-right' : 'text-left')}>
                                    <div className={" text-left inline-block p-2 my-2 rounded-md text-sm  "+ (message.sender === id ? 'bg-pink-600 text-white' : 'bg-white text-pink-600')}>
                                        {message.text}
                                        {message.file && (
                                            <div>
                                                <a target="_blank" className="flex items-center border-b-2" href={axios.defaults.baseURL + "/uploads/" + message.file }>
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                                </svg>
                                                    {message.file}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                    </div>
                                ))}
                                <div ref={divUnderMessages}></div>
                            </div>
                        </div>  
                    )}
                </div>
                    {!!selectedUserId && (
                        <form className="flex gap-2" onSubmit={sendMessage}>
                            <input type="text" 
                            value={newMessageText} onChange={ ev => setNewMessageText(ev.target.value)}
                            className="bg-white flex-grow rounded-2xl border p-2"
                            placeholder="Type your message here" />
                            <label className=" bg-pink-600 rounded-2xl text-white p-2" >
                                <input type="file" className="hidden" onChange={sendFile} />
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                </svg>
                            </label>
                            <button type="submit" className=" bg-pink-600 rounded-2xl text-white p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                            </button>
                        </form>
                    )}
            </div>
        </div>
    )
}