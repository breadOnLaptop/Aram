import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

const ContentElement = ({ contact, onClick, isActive }) => {

    useEffect(() => {
        // Preload contact user image
        const img = new Image();
        img.src = contact.contactUser?.profilePic || '/images/user.jpg';
    }, [contact.contactUser]);

    const { authUser } = useAuthStore();
    const contactUser = contact.contactUser || {};
    const lastMessage = contact.lastMessage?.content || '';
    const isUnread = contact.lastMessage && contact.lastMessage.receiverId==authUser._id && !contact.lastMessage.read;

    return (
        <div
            className={`p-4 w-full flex gap-2 items-center relative  
                  border-y border-muted cursor-pointer transition-colors
                  ${isActive ? 'bg-emerald-500/20' : 'hover:bg-emerald-500/10'}`}
            onClick={() => onClick(contact)}
        >
            <div className="border size-12 rounded-xl flex-shrink-0 relative non-selectable-text">
                <img
                    src={contactUser.profilePic || '/images/user.jpg'}
                    className="size-12 rounded-xl object-cover"
                    draggable={false}
                    alt={contactUser.firstName || 'User'}
                />
                <div className="size-2 rounded-full absolute bg-green-500 right-0 -bottom-0.5"></div>
            </div>

            {/* Details */}
            <div className="flex flex-col justify-evenly overflow-hidden non-selectable-text flex-1">
                <h4 className="font-medium text-[16px] truncate">
                    {`${contactUser.firstName || ''} ${contactUser.lastName || ''}`.trim() || 'Unknown User'}
                </h4>
                <p className={`text-sm text-[12px] w-[90%] truncate ${
                    isUnread ? 'font-semibold opacity-90' : 'opacity-70'
                }`}>
                    {lastMessage || 'No messages yet'}
                </p>
            </div>

            {/* Time & Status */}
            <div className="absolute text-[11px] right-4 opacity-70 top-4 flex flex-col items-end gap-1">
                <div>
                    {contact.updatedAt && new Date(contact.updatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </div>
                {isUnread && (
                    <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                        New
                    </span>
                )}
            </div>
        </div>
    );
};

export default ContentElement;