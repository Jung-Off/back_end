import { Injectable } from '@nestjs/common';
import { Socket } from 'socket.io';
import { Client } from 'socket.io/dist/client';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { IChatRoom, IUser, UserStatus } from '../types/types';
import { SUserService } from './socketUser.service';

@Injectable()
export class RoomService {
  // 내부 변수들도 초기화?
  public readonly rooms: Map<string, IChatRoom>;
  constructor() {
    this.rooms = new Map();
  }

  getPublicRooms(socket: any) {
    const charRoomList = [];
    this.rooms.forEach((value, key, map) => {
      charRoomList.push(key);
    });
    return charRoomList; // 배열이 아니라 map으로 리턴
  }

  // setPublicRooms(socket: any, chatroomInfo : IChatRoom | null) {
  //   const sids = socket.adapter.sids;
  //   const room_copy = socket.adapter.rooms;
  //   console.log('rorororoorooom', room_copy);
  //   room_copy.forEach((_: any, key: any) => {
  //     if (sids.get(key) === undefined) {
  //       this.rooms.set(key, null);
  //     }
  //   });
  //   return this.rooms; // 배열이 아니라 map으로 리턴
  // }

    addRoom(roomname: string, charRoom : IChatRoom): void {
      this.rooms.set(roomname, charRoom);
    } 
      
    getRoom(intra: string): RoomService | null {
        // console.log('getRoom...');
        for (const room of this.rooms) {
            if (this.rooms[intra]) 
              return room[intra];
        console.log('getRoom...');
      }
      return null;
    }
  
    getInRoomUser(roomname :string) : void {
      console.log('getInRoomUser');
      console.log(this.rooms.get(roomname).users);
      // return (this.rooms.get(roomname).users);
    }

  showRooms(): void {
    console.log('showRooms............');
    this.rooms.forEach((a) => {
      console.log('this is room name : ', a.name);
      console.log(a.id);
      console.log(a.pw);
      console.log(a.users);
      console.log(a.ban);
      console.log(a.host);
    });
    console.log('showRooms End............');
  }

  addUser(name: string, user: IUser, client: Socket): void {
    console.log('AddUser');
    this.rooms.get(name).users[client.id] = user;
  }

  deleteUserBysocketId(socketid: string, room: string) {
    this.rooms.get(room).users.delete(socketid);
  }

  deleteUser(socketid: string) {
    this.rooms.forEach((room) => {
      if (room.users.get(socketid) != null) room.users.delete(socketid);
    });
    // this.rooms.get(room).users.delete(socketid);
  }

  roomHowManyPeople(room: string) {
    if (this.rooms.get(room).users.size <= 0) this.rooms.delete(room);
  }
}
