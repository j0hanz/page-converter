import type { NextConfig } from 'next';

import fs from 'node:fs';
import { findPackageJSON } from 'node:module';
import path from 'node:path';

interface LockfilePackage {
  dependencies?: Record<string, string>;
}

interface PackageLock {
  packages?: Record<string, LockfilePackage>;
}

const FETCH_URL_PACKAGE_NAME = '@j0hanz/fetch-url-mcp';
const FETCH_URL_PACKAGE_FALLBACK_PATH = 'node_modules/@j0hanz/fetch-url-mcp';

function readPackageLockPackages(): Record<string, LockfilePackage> {
  try {
    const packageLockPath = path.join(process.cwd(), 'package-lock.json');
    const packageLock = JSON.parse(
      fs.readFileSync(packageLockPath, 'utf8')
    ) as PackageLock;

    return packageLock.packages ?? {};
  } catch {
    return {};
  }
}

function toLockfilePackagePath(absolutePackagePath: string): string {
  return path
    .relative(process.cwd(), absolutePackagePath)
    .replaceAll('\\', '/');
}

function readFetchUrlPackagePath(): string {
  const packageJsonPath = findPackageJSON(
    FETCH_URL_PACKAGE_NAME,
    import.meta.url
  );
  if (!packageJsonPath) {
    return FETCH_URL_PACKAGE_FALLBACK_PATH;
  }

  return toLockfilePackagePath(path.dirname(packageJsonPath));
}

function readPackageNameFromPath(packagePath: string): string {
  const segments = packagePath.split('/');
  const packageName = segments.at(-1) ?? '';
  const scope = segments.at(-2);

  return scope?.startsWith('@') ? `${scope}/${packageName}` : packageName;
}

function createDependencyPathResolver(
  packages: Record<string, LockfilePackage>
) {
  const packagePaths = new Set(Object.keys(packages));
  const fallbackPackagePathBySuffix = new Map<string, string>();

  for (const packagePath of [...packagePaths].sort()) {
    const packageName = readPackageNameFromPath(packagePath);
    const packageSuffix = `/node_modules/${packageName}`;

    if (!fallbackPackagePathBySuffix.has(packageSuffix)) {
      fallbackPackagePathBySuffix.set(packageSuffix, packagePath);
    }
  }

  return function resolveDependencyPath(
    dependencyName: string,
    fromPackagePath: string
  ): string | null {
    const nestedPath = `${fromPackagePath}/node_modules/${dependencyName}`;
    if (packagePaths.has(nestedPath)) {
      return nestedPath;
    }

    const hoistedPath = `node_modules/${dependencyName}`;
    if (packagePaths.has(hoistedPath)) {
      return hoistedPath;
    }

    return (
      fallbackPackagePathBySuffix.get(`/node_modules/${dependencyName}`) ?? null
    );
  };
}

function collectPackageTraceGlobs(rootPackagePath: string): string[] {
  const packages = readPackageLockPackages();
  const resolveDependencyPath = createDependencyPathResolver(packages);
  const visitedPackagePaths = new Set<string>();

  const visit = (packagePath: string | null) => {
    if (!packagePath || visitedPackagePaths.has(packagePath)) {
      return;
    }

    const packageData = packages[packagePath];
    if (!packageData) {
      return;
    }

    visitedPackagePaths.add(packagePath);

    for (const dependencyName of Object.keys(packageData.dependencies ?? {})) {
      visit(resolveDependencyPath(dependencyName, packagePath));
    }
  };

  visit(rootPackagePath);

  if (visitedPackagePaths.size === 0) {
    return [`./${FETCH_URL_PACKAGE_FALLBACK_PATH}/**/*`];
  }

  return [...visitedPackagePaths]
    .sort()
    .map((packagePath) => `./${packagePath}/**/*`);
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  outputFileTracingIncludes: {
    '/api/transform': collectPackageTraceGlobs(readFetchUrlPackagePath()),
  },
};

export default nextConfig;
