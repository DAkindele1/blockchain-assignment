import React, { useEffect } from 'react'

function PlayerTable({playerData, currentPlayer}) {
  useEffect(() => {
    document
      .getElementById(`player-row-${currentPlayer}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [currentPlayer])

  return (
    <table className="hidden md:table w-full">
          <caption className="sr-only">Players, scores and whose turn it is</caption>
          <thead>
            <tr className=" w-full h-[50px] bg-[#ffffff20] text-sm lg:text-base items-center  p-2 rounded-lg border border-[#FFFFFF40] hover:border-[#ffffff80] duration-300">
              <th scope="col" className=" text-center text-white">Icons</th>
              <th scope="col" className=" text-center text-white">Name</th>
              <th scope="col" className=" text-center text-white">Total Points</th>
              <th scope="col" className=" text-center text-white">Running Points</th>
            </tr>
          </thead>
       
          <tbody>
            {playerData?.map((player, index) => (
              <tr
                key={index}
                id={`player-row-${index}`}
                aria-current={index === currentPlayer % playerData.length ? "true" : undefined}
                className={`${
                  index === currentPlayer % playerData.length
                    ? "bg-[#ffffff40]"
                    : ""
                } w-full text-base lg:text-xl p-2 rounded-lg bg-[#ffffff10] border border-[#FFFFFF40] hover:border-[#ffffff80] duration-300 scroll-mt-[300px] text-center  text-white `}
              >
                <td className="h-[70px] p-2 grid place-content-center">
                  <figure className="w-[50px] bg-[#ffffff20] p-2 border border-[#FFFF8F40] rounded">
                    <img src={player.avatar} alt="" />
                  </figure>
                </td>
                <td className="">
                  {player.name === ''?player.tag:player.name}
                </td>
                <td className="">
                  {player.total_points + player.running_points}
                </td>
                <td className="">
                  {player.running_points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
  )
}

export default PlayerTable