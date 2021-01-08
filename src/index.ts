import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import fs from 'fs';
import path from 'path';
import { Compiler, DefinePlugin } from 'webpack';

const lookupFile = (dir: string, formats: string[], pathOnly = false): string | undefined => {
  for (const format of formats) {
    const fullPath = path.join(dir, format);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return pathOnly ? fullPath : fs.readFileSync(fullPath, 'utf-8');
    }
  }
  const parentDir = path.dirname(dir);
  if (parentDir !== dir) {
    return lookupFile(parentDir, formats, pathOnly);
  }
};

const loadEnv = (mode: string | undefined, root: string) => {
  const env: Record<string, string> = {};

  for (const key in process.env) {
    if (env[key] === undefined) {
      env[key] = process.env[key] as string;
    }
  }

  const envFiles = [
    /** mode local file */ `.env.${mode}.local`,
    /** mode file */ `.env.${mode}`,
    /** local file */ `.env.local`,
    /** default file */ `.env`,
  ];

  envFiles.forEach((file) => {
    const path = lookupFile(root, [file], true);
    if (!path) {
      return;
    }

    const parsed = dotenv.parse(fs.readFileSync(path), {
      debug: !!process.env.DEBUG || undefined,
    });

    dotenvExpand({
      parsed,
      ignoreProcessEnv: true,
    } as any);

    for (const [key, value] of Object.entries(parsed)) {
      if (env[key] === undefined) {
        env[key] = value;
      }
    }
  });

  return env;
};

export class DotenvWebpackPlugin {
  apply(compiler: Compiler) {
    new DefinePlugin({
      'process.env': loadEnv(process.env.NODE_ENV, process.cwd()),
    }).apply(compiler);
  }
}
