import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, HttpCode, UseInterceptors, UploadedFile, Header,
} from '@nestjs/common';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CurrentUser } from '../common/decorators/current-user.decorator';

import { PostsService } from './posts.service';

import { createImageUploadInterceptor, saveUploadedFile } from '../common/upload/upload.config';
import { UpdatePostDto } from './dto/update-post.dto';
import { parseTagsInput } from './post-tags.util';



@ApiTags('커뮤니티')

@Controller('posts')

export class PostsController {

  constructor(private postsService: PostsService) {}



  @Post()

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '게시글 작성' })

  @ApiConsumes('multipart/form-data')

  @UseInterceptors(createImageUploadInterceptor('image', 'post'))

  async create(

    @CurrentUser() user: any,

    @UploadedFile() file: Express.Multer.File,

    @Body() body: { title: string; content: string; catchId?: string; tags?: string },

  ) {

    const result = await this.postsService.create(user.id, {

      title: body.title,

      content: body.content,

      catchId: body.catchId || undefined,

      imageUrl: saveUploadedFile(file),

      tags: parseTagsInput(body.tags),

    });

    return { success: true, data: result };

  }



  @Get()
  @Header('Cache-Control', 'public, max-age=30')
  @ApiOperation({ summary: '커뮤니티 글 목록' })

  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('sort') sort: 'latest' | 'popular' = 'latest',
    @Query('tag') tag?: string,
    @Query('q') q?: string,
  ) {

    const result = await this.postsService.findAll(Number(page), Number(limit), sort, tag, q);

    return { success: true, data: result };

  }



  @Get(':id')

  @ApiOperation({ summary: '게시글 상세' })

  async findOne(@Param('id') id: string) {

    const result = await this.postsService.findById(id);

    return { success: true, data: result };

  }



  @Post(':id/comments')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '댓글 작성' })

  async addComment(

    @Param('id') postId: string,

    @CurrentUser() user: any,

    @Body('content') content: string,

  ) {

    const result = await this.postsService.addComment(postId, user.id, content);

    return { success: true, data: result };

  }



  @Patch(':id')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @ApiOperation({ summary: '게시글 수정' })

  @ApiConsumes('multipart/form-data')

  @UseInterceptors(createImageUploadInterceptor('image', 'post'))

  async update(

    @Param('id') id: string,

    @CurrentUser() user: any,

    @UploadedFile() file: Express.Multer.File,

    @Body() body: UpdatePostDto,

  ) {

    const imageUrl = body.removeImage === 'true'
      ? null
      : file
        ? saveUploadedFile(file)
        : undefined;

    const result = await this.postsService.update(id, user.id, {

      title: body.title,

      content: body.content,

      catchId: body.catchId,

      imageUrl,

      tags: body.tags !== undefined ? parseTagsInput(body.tags) : undefined,

    });

    return { success: true, data: result };

  }



  @Delete(':id')

  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth()

  @HttpCode(200)

  @ApiOperation({ summary: '게시글 삭제' })

  async delete(@Param('id') id: string, @CurrentUser() user: any) {

    await this.postsService.delete(id, user.id);

    return { success: true };

  }

}


