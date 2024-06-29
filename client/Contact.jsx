import Avatar from "./src/Avatar";

export default function Contact({id ,username , onClick , selected , online}) {
    return (
        <div onClick={() => onClick(id)} 
                        className={" border-b border-pink-400 flex gap-2 items-center cursor-pointer " +(selected ? 'bg-white' : '')}>
                        {selected && (
                            <div className=" w-2 bg-pink-500 h-12 rounded-r-md"></div>
                        )}
                        <div className="flex gap-2 py-2 pl-4 items-center">
                            <Avatar online={online} username={username} userId = {id} />
                            <span className="text-gray-800">
                                {username}
                            </span>
                        </div>
                    </div>
    );
}