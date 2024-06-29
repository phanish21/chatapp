import axios from "axios";
import { useContext, useState } from "react";
import { UserContext } from "./UserContext";

export default function RegisterAndLoginFormr() {
    const [username , setUsername] = useState('');
    const [password , setpassword] = useState('');
    const [isLoginOrRegister , setIsLoginOrRegister] = useState('login');
    const {setUsername : setLoggedInUsername, setId} = useContext(UserContext);
    async function handleSubmit(ev) {
        const url = isLoginOrRegister === 'register' ? 'register' : 'login' ;
        ev.preventDefault();
        const {data} = await axios.post( '/' + url , {username , password});
        setLoggedInUsername(username);
        setId(data.id);
    }
    return (
        <div className=" bg-pink-300 h-screen flex items-center">
            <form className="w-64 mx-auto m-12 " onSubmit={handleSubmit}>
                <input type="text"
                onChange={ev => setUsername(ev.target.value)} 
                className=" block w-full rounded-xl mb-2 p-2 " 
                placeholder="Username"/>
                <input type="password" 
                onChange={ev => setpassword(ev.target.value)}
                className=" block w-full rounded-xl mb-2 p-2" 
                placeholder="Password" />
                <button className="bg-pink-500 text-white block w-full rounded-xl p-2">
                    {isLoginOrRegister === 'register' ? 'Register' : 'Login'}
                </button>
                <div className=" text-center mt-2">
                    {isLoginOrRegister === 'register' && (
                        <div>
                            Already have an account?<br/>
                                <button className=" underline" onClick={() => setIsLoginOrRegister('login')}>Login Here</button>
                        </div>
                    )}
                    {isLoginOrRegister === 'login' && (
                        <div>
                        Don't have an account?<br/>
                            <button className=" underline" onClick={() => setIsLoginOrRegister('register')}>Register Here</button>
                    </div>
                )}
                </div>
            </form>
             
        </div>
    );
}