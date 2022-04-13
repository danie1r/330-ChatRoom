# CSE330
Eric Tabuchi (ETabuchi, ID: 501415) Daniel Ryu (danie1r, ID: 502005)


Description:
* When first accessing teh site, you can create an account or sign in. Once signed in, you will see the global chat and all available chat rooms to join.
* Chat rooms are visualized by:
  * Name of room
  * Room host (who can kick and ban users except themself)
  * Public (anyone can join) or private (requires password)
  * Number of people who have joined this room
    * Even when you leave the chat room, that number will not decrease because you are still a member of that room
  * A join button to enter the room and become a member
* Upon joining a chat room, you will see the room's chat history 
  * You cannot join a room you already are a part of 
  * Users can send messages to all members in the chat or private messages to people
    * Private messages are colored red to distinguish between them in the chat history
* Joining another room will replace the current room's chat history with the new room's
* You can leave a room you are in which will make you no longer see the room chat and only global chat. 

Creative portion:
* Logged in users should be able to see a selection of all the rooms they have created / are the host of
  * Users can then delete a chat room from that selection when pressing the delete button
  * Deleting a chat room should kick all members currently in the room and remove it from the joinable rooms shown 
* Besides being kicked, banned, or joining another chat room, the user has a "leave button" when in a chat room to leave the current chat room they are in
* There is a global chat present for all logged in users (no chat room needed to joing before typing)  
