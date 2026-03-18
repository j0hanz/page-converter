import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { NextConfig } from "next";

interface PackageManifest {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

const require = createRequire(import.meta.url);

function readPackageManifest(packageDirectory: string): PackageManifest | null {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(packageDirectory, "package.json"), "utf8"),
    ) as PackageManifest;
  } catch {
    return null;
  }
}

function findPackageDirectory(resolvedEntryPath: string): string | null {
  const { root } = path.parse(resolvedEntryPath);
  let currentDirectory = path.dirname(resolvedEntryPath);

  for (;;) {
    if (fs.existsSync(path.join(currentDirectory, "package.json"))) {
      return currentDirectory;
    }
    if (currentDirectory === root) {
      return null;
    }
    currentDirectory = path.dirname(currentDirectory);
  }
}

function resolveInstalledPackageDirectory(
  packageName: string,
  fromDirectory: string,
): string | null {
  try {
    const resolvedEntryPath = require.resolve(packageName, {
      paths: [fromDirectory],
    });
    return findPackageDirectory(resolvedEntryPath);
  } catch {
    return null;
  }
}

function normalizeTraceGlob(packageDirectory: string): string {
  const relativeDirectory = path.relative(process.cwd(), packageDirectory);
  return `./${relativeDirectory.split(path.sep).join("/")}/**/*`;
}

function readRuntimeDependencyNames(
  packageDirectory: string,
): readonly string[] {
  const manifest = readPackageManifest(packageDirectory);
  return Object.keys({
    ...(manifest?.dependencies ?? {}),
    ...(manifest?.optionalDependencies ?? {}),
  }).sort();
}

function collectPackageTraceGlobs(packageName: string): string[] {
  const visitedPackageDirectories = new Set<string>();

  const visit = (dependencyName: string, fromDirectory: string) => {
    const packageDirectory = resolveInstalledPackageDirectory(
      dependencyName,
      fromDirectory,
    );
    if (!packageDirectory || visitedPackageDirectories.has(packageDirectory)) {
      return;
    }

    visitedPackageDirectories.add(packageDirectory);

    for (const runtimeDependencyName of readRuntimeDependencyNames(
      packageDirectory,
    )) {
      visit(runtimeDependencyName, packageDirectory);
    }
  };

  visit(packageName, process.cwd());

  if (visitedPackageDirectories.size === 0) {
    return [`./node_modules/${packageName}/**/*`];
  }

  return [...visitedPackageDirectories].sort().map(normalizeTraceGlob);
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/transform": collectPackageTraceGlobs("@j0hanz/fetch-url-mcp"),
  },
};

export default nextConfig;
