import {
  Container,
  Group,
  List,
  Text,
  rem,
  useMantineTheme,
} from '@mantine/core';
import { Dropzone, DropzoneProps, IMAGE_MIME_TYPE } from '@mantine/dropzone';
import { IconPhoto, IconUpload, IconX } from '@tabler/icons-react';
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const chunkSize = 10 * 1024;

type CustomFile = File & {
  finalFilename?: string;
};

export default function Home(props: Partial<DropzoneProps>) {
  const theme = useMantineTheme();

  const [files, setFiles] = useState<CustomFile[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(
    null
  );
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null);
  const [lastUploadedFileIndex, setLastUploadedFileIndex] = useState<
    number | null
  >(null);

  const readAndUploadCurrentChunk = useCallback(() => {
    const reader = new FileReader();

    if (currentFileIndex == null) return;
    const file = files[currentFileIndex];

    if (!file || currentChunkIndex === null) {
      return;
    }

    const from = currentChunkIndex * chunkSize;
    const to = from + chunkSize;
    const blob = file.slice(from, to);
    reader.onload = e => uploadChunk(e);
    reader.readAsDataURL(blob);
  }, [currentChunkIndex, currentFileIndex, files]);

  const uploadChunk = (readerEvent: ProgressEvent<FileReader>) => {
    if (currentFileIndex == null) return;

    const file = files[currentFileIndex];

    if (!file || currentChunkIndex === null) {
      return;
    }

    if (!readerEvent.target) return;

    const data = readerEvent.target.result;

    const params = new URLSearchParams();
    params.set('name', file.name);
    params.set('size', file.size.toString());
    params.set('currentChunkIndex', currentChunkIndex.toString());
    params.set('totalChunks', Math.ceil(file.size / chunkSize).toString());

    const headers = { 'Content-Type': 'application/octet-stream' };
    //!TODO: Need to implememt server
    const url = process.env.NEXT_PUBLIC_API + params.toString();

    axios.post(url, data, { headers }).then(response => {
      const file = files[currentFileIndex];
      const filesize = files[currentFileIndex].size;
      const chunks = Math.ceil(filesize / chunkSize) - 1;
      const isLastChunk = currentChunkIndex === chunks;

      if (isLastChunk) {
        file.finalFilename = response.data.finalFilename;
        setLastUploadedFileIndex(currentFileIndex);
        setCurrentChunkIndex(null);
      } else {
        setCurrentChunkIndex(currentChunkIndex + 1);
      }
    }).catch;
  };

  useEffect(() => {
    if (lastUploadedFileIndex === null) {
      return;
    }

    if (!currentFileIndex) return;

    const isLastFile = lastUploadedFileIndex === files.length - 1;
    const nextFileIndex = isLastFile ? null : currentFileIndex + 1;
    setCurrentFileIndex(nextFileIndex);
  }, [currentFileIndex, files.length, lastUploadedFileIndex]);

  useEffect(() => {
    if (files.length > 0) {
      if (currentFileIndex === null) {
        setCurrentFileIndex(
          lastUploadedFileIndex === null ? 0 : lastUploadedFileIndex + 1
        );
      }
    }
  }, [currentFileIndex, files.length, lastUploadedFileIndex]);

  useEffect(() => {
    if (currentFileIndex !== null) {
      setCurrentChunkIndex(0);
    }
  }, [currentFileIndex]);

  useEffect(() => {
    if (currentChunkIndex !== null) {
      readAndUploadCurrentChunk();
    }
  }, [currentChunkIndex, readAndUploadCurrentChunk]);

  return (
    <Container>
      <Dropzone
        onDrop={files => setFiles(files)}
        onReject={files => console.log('rejected files', files)}
        maxSize={3 * 1024 ** 2}
        accept={IMAGE_MIME_TYPE}
        {...props}
      >
        <Group
          position='center'
          spacing='xl'
          style={{ minHeight: rem(220), pointerEvents: 'none' }}
        >
          <Dropzone.Accept>
            <IconUpload
              size='3.2rem'
              stroke={1.5}
              color={
                theme.colors[theme.primaryColor][
                  theme.colorScheme === 'dark' ? 4 : 6
                ]
              }
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              size='3.2rem'
              stroke={1.5}
              color={theme.colors.red[theme.colorScheme === 'dark' ? 4 : 6]}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconPhoto size='3.2rem' stroke={1.5} />
          </Dropzone.Idle>
          <div>
            <Text size='xl' inline>
              Drag images here or click to select files
            </Text>
            <Text size='sm' color='dimmed' inline mt={7}>
              Attach as many files as you like, each file should not exceed 5mb
            </Text>
          </div>
        </Group>
      </Dropzone>
      <List>
        {files.map(file => (
          <List.Item key={file.lastModified}>{file.name}</List.Item>
        ))}
      </List>
    </Container>
  );
}
