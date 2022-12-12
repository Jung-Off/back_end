import {
  Inject,
  LoggerService,
  Logger,
  OnModuleInit,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthGuardLocal } from '../auth/auth.guard';
import { UsersService } from '../users/services/users.service';
import { JWTExceptionFilter } from '../exception/jwt.filter';
import { RoomService } from './room.service';
import { SUserService } from './socketUser.service';
import { IChatRoom, IUser, UserStatus } from '../types/types';
import { IsUppercase } from 'class-validator';
import { throwIfEmpty } from 'rxjs';
import { LoggingInterceptor } from '../logger.Interceptor';

@UseInterceptors(LoggingInterceptor)
@UseGuards(AuthGuardLocal)
@UseFilters(JWTExceptionFilter)
@WebSocketGateway({
  namespace: 'api/socket',
})
export class MyGateway implements OnModuleInit, OnGatewayDisconnect {
  constructor(private room: RoomService, private user: SUserService,
    @Inject(Logger) private readonly logger: LoggerService
    ) {}
  @WebSocketServer()
  server: Server;

  //  socket 객체는 개별 클라이언트와의 interacting을 위한 기본적인 객체
  onModuleInit() {
    this.server.on('connection', (socket) => {
      console.log('onModuleInit');
      this.logger.log('connection intra: gilee', 'socket.id:', socket.id); // 자기 자신

      const avatar = 'avatar_copy';
      const nickname = 'jjjjjjjj';
      const intra = 'jji_copy';
      const status: UserStatus = 1; // 상태로 추가하면 오류!
      const user_copy: IUser = {
        client: socket.client,
        avatar,
        nickname,
        intra,
        status,
      };

      this.user.addUser(socket.id, user_copy); // 사람을 추가해서 user에 넣기
      this.user.getUser(socket.id);
      this.user.getUsers();
    });
  }

  handleDisconnect(client: any) {
    
    console.log(client.client['id']);
    console.log(client.id);
    console.log('Dissconnected start');

    this.logger.log('Disconnection intra: gilee socket.id:', client.id); // 자기 자신
    //유저를 제거하고 방에서도 제거 >> 방에서 제거하는 것은 어떻게 하지?, 방도 추가를 해주어야 하나? 싶은데
    this.room.deleteUser(client.id);

    this.user.removeUser(client.id);
    console.log('Dissconnected');
  }

  // // 방 정보 호출
  // 방 생성

  // sids와 room과의 비교를 통해 퍼블릭 룸 나타내기! 임의의 chatroomlist

  // 방 정보 호출
  @SubscribeMessage('getChatRoomInfo')
  letAllUsers(client: Socket) {
    this.logger.log('getChatRoomINfo~~~');// 누가들어왔는지 socket id, intra
    this.room.showRooms();
    return this.room.getPublicRooms(client); // return이 callback이다 fx를 보낼 필요가 없다!
  }

  // 방 생성
  @SubscribeMessage('create-room')
  createroom(client: Socket, room: string) {
    console.log('create-room');

    const id = 0;
    const name: string = room;
    const isPublic = true;
    const users: Map<string, IUser> = new Map();
    let muted: IUser[];
    let ban: IUser[];
    const host = 'host';

    const chatRoom_copy: IChatRoom = {
      id,
      name,
      isPublic,
      users,
      muted,
      ban,
      host,
    };

    this.room.addRoom(room, chatRoom_copy);
    this.room.showRooms();

    const userTemp: IUser = this.user.getUser(client.id); // 현재 클라이언트와 같은 사람 찾아와

    this.room.addUser(room, userTemp, client); // 방에 사람 추가
    this.room.getInRoomUser(room); // 여기서는 방에 사람이 있는지

    client.join(room);
    client.emit('new-room-created', room); // 다른 이벤트 보내기!
    return {}; // 인자 없는 콜백
  }

  @SubscribeMessage('newMsg')
  newmsg(
    socket: Socket,
    newMsgObj: { room: string; user: string; msg: string },
  ) {
    console.log('newMsg getto', newMsgObj);
    socket.to(newMsgObj.room).emit('newMsg', newMsgObj);
    return {};
  }

  // 방 생성하지 않고 입장
  @SubscribeMessage('enterRoom')
  enterRoom(client: Socket, joinInfo: { name: string; room: string }) {
    client.join(joinInfo.room);
    console.log('jjjjoooin', joinInfo);

    // 여기는 상상으로 짜봄
    // 자신의 아이디로 유저정보 뽑고, 그 유저로 있는 방에 참가! 방의 user에도 인원을 추가 해 주어야함!
    const userTemp: IUser = this.user.getUser(client.id);
    //room에 참가
    this.room.addUser(joinInfo.room, userTemp, client); // 방에 사람 추가하기
    this.room.getInRoomUser(joinInfo.room); // 여기서는 방에 사람이 있는지

    return {};
  }

  // 방 나가기 버튼
  @SubscribeMessage('leaveRoom')
  leaveRoom(socket: Socket, roomInfo: { room: string }) {
    socket.leave(roomInfo.room);

    // this.logger.log('leaveRoom Before');
    // console.log('leaveRoom Before')
    // this.room.showRooms();

    // 여기는 추가
    this.room.deleteUserBysocketId(socket.id, roomInfo.room);
    this.room.showRooms();

    // 방에 아무도 없으면 방제거
    this.room.roomHowManyPeople(roomInfo.room);
    // this.logger.log('leaveRoom After');
    // console.log('leaveRoom After')
    // this.room.showRooms();

    return {};
  }

  // 다른방 눌렀다가 오기
  @SubscribeMessage('clearRoom')
  clearRoom(socket: Socket) {
    // this.logger.log('clearRoom Before');
    // console.log('clearRoom Before')
    // this.room.showRooms();

    socket.rooms.forEach((ele: any) => {
      if (ele != socket.id) {
        socket.leave(ele);
        this.room.deleteUserBysocketId(socket.id, ele);
        // 방에 아무도 없으면 방제거
        this.room.roomHowManyPeople(ele);
      }
      // this.logger.log('clearRoom After');
      // console.log('clearRoom After')
      // this.room.showRooms();
    });
  }

  // // // @SubscribeMessage('newMsg')
  // // // sentMsg(client : Socket, room: string) {
  // // //     // console.log(typeof(fx));
  // // //     console.log('newMsg');
  // // //     client.join(room);
  // // //     // console.log(this.gatewayService.publicRooms(client, this.publicRoom).length);
  // // //     client.emit("new-room-created"); // 다른 이벤트 보내기!
  // // //     return {}; // 인자 없는 콜백
  // // // };
  // // 이것을 기반으로 callback 해결을 해보자 그리고 case 정리해두기!

  // // socket.leave('방이름');
  // // 방 나갈때 제거가 안됨
  // @SubscribeMessage('disconnecting')
  // leftRoom(socket: Socket) {
  //   // socket.rooms.forEach((room) =>
  //     // socket.to(room).emit("bye", socket.id));

  //     }
  //     // 본인 소켓이 조인 되어있는 방 string
  //     @SubscribeMessage('joinedRoom')
  //     joinedRoom(socket: Socket) {
  //       let ret: string;
  //       socket.rooms.forEach((idx) => {
  //         ret += idx + ' ';
  //       })
  //       console.log('===');
  //       console.log(ret);
  //       console.log('===');
  //       return ret;
  // }
  /////////////////////////////////////////////////////////////////////////
  // 본인 소켓이 조인 되어있는 방

  // this.server.on("create-room", (socket, room,fx) => {
  // socket.on("create-room", (room,fx) => {
  //     console.log('create-room');
  //     socket.join(room);
  //     console.log(this.publicRooms(socket).length);
  //     fx();
  //     socket.emit("new-room-created");
  // }); // 방에 참가, 새방 생성 되었다

  // socket에서 data가져오기
  //   @UseGuards(AuthGuardLocal)
  //   @SubscribeMessage('letAllUsers')
  //   async AllUsers(@MessageBody() intra: string) {
  //     console.log(intra);
  //     console.log(await this.users.findAll());
  //     this.server.emit('emitUsers', {
  //       msg: intra,
  //       content: await this.users.findAll(),
  //     });
  //   }
}
