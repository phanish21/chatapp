export default function Avatar({username , userId , online}) {
    const colors = [
        "bg-pink-50",
        "bg-pink-100",
        "bg-pink-200",
        "bg-pink-300",
        "bg-pink-400",
        "bg-pink-500",
        "bg-pink-600",
        "bg-pink-700",
        "bg-pink-800",
        "bg-pink-900"
      ]
    const userIdBase10 = parseInt(userId , 16);
    const colorIndex = userIdBase10 % colors.length;
    const color = colors[colorIndex];
    return (
        <div className={"w-8 h-8 relative rounded-full flex items-center " + color }>
            <div className="text-center w-full">
                {username[0]}
            </div>
            { online && (
                <div className=" absolute w-2.5 h-2.5 bg-red-600 bottom-0 right-0 rounded-full border border-p-pink "></div>
            )}
        </div>
    );
}