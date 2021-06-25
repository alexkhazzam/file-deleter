import childProcess from "child_process";
import fs from "fs";

interface FileTypes {
  includedFileNames: string[];
  excludedFileNames?: string[];
}

interface FileRemovalOptions {
  startingPath: string;
  stoppingPath: string;
  fileTypes: FileTypes;
}

interface DeleteFile {
  (startingPath: string, wildcard: string): void;
}

/**
 * @param options object that contains the same options as the parameters in fileRemoval() except a callback
 */

const handleFileRemovalArgErrors = (fileRemovalOptions: FileRemovalOptions) => {
  if (fileRemovalOptions.fileTypes.includedFileNames.length === 0) {
    throwError("includedFileNames option must not be an empty array");
  }

  if (typeof fileRemovalOptions.startingPath === "number") {
    throwError("starting and stopping paths must both be strings.");
  }

  if (typeof fileRemovalOptions.stoppingPath === "number") {
    throwError("starting and stopping paths must both be strings.");
  }

  if (fileRemovalOptions.fileTypes.hasOwnProperty("ignoredFileNames")) {
    if (fileRemovalOptions.fileTypes.excludedFileNames!.length === 0) {
      throwError("excludedFileNames cannot be empty if it is an option");
    }
  }
};

/**
 * @param errorMessage error message that should be printed to the terminal
 */

const throwError = (errorMessage: string | Error): void => {
  throw errorMessage;
};

/**
 * @param path absolute path to a file or directory
 * @returns true or false depending on whether the path leads to a directory or file
 */

const isFile = (path: string): boolean => fs.statSync(path).isFile();

/**
 * @param path absolute path to a file or directory
 * @param cb callback that executes once file was successfully deleted
 */

const deleteFile = (path: string, cb: () => void): void => {
  fs.unlink(path, (): void => cb());
};

/**
 * @param path absolute file path
 * @param cb callback that returns the root directory relative to a path
 */

const ls = (targetPath: string, cb: (dir: string[]) => void): void => {
  childProcess.exec(
    `ls ${targetPath}`,
    (
      error: childProcess.ExecException | null,
      stdout: string,
      stderr: string
    ): void => {
      error || stderr ? throwError(error || stderr) : cb(stdout.split("\n"));
    }
  );
};

/**
 * @param targetPath absolute path to directory
 * @param cb callback that returns files and folders in a directory
 */

const generateDirectory = (
  targetPath: string,
  cb: (path: string) => void
): void => {
  ls(targetPath, (dir: string[]): void => {
    dir.pop(); // TODO use slice()
    dir.forEach((f: string): void => cb(f));
  });
};

const managePath = (
  targetPath: string,
  requirements: (absolutePathFromTargetDirectory: string) => boolean,
  caller: (targetPath: string) => void
): void => {
  generateDirectory(targetPath, (path: string): void => {
    const absolutePathFromTargetDirectory: string = `${targetPath}/${path}`;

    if (
      isFile(absolutePathFromTargetDirectory) &&
      requirements(absolutePathFromTargetDirectory)
    ) {
      deleteFile(absolutePathFromTargetDirectory, (): void => {});
    } else if (!isFile(absolutePathFromTargetDirectory)) {
      caller(absolutePathFromTargetDirectory);
    }
  });
};

/**
 * @function deleteFileWithCertainWord
 * @function deleteFileWithCertainExtension
 * @function deleteFileWithCertainExtensionAndWord
 * @function deleteFileWithMultipleWords
 * @function deleteFileWithCertainExtensionAndMultipleWords
 *
 * @param targetPath current absolute path that child_process will execute and essentially perform 'ls' on
 * @param wildcard special string that specifies what type of file to include in the deletion process
 */

let deleteFileWithCertainWord: DeleteFile;
let deleteFileWithCertainExtension: DeleteFile;
let deleteFileWithCertainExtensionAndWord: DeleteFile;
let deleteFileWithMultipleWords: DeleteFile;
let deleteFileWithCertainExtensionAndMultipleWords: DeleteFile;

deleteFileWithCertainWord = (targetPath: string, wildCard: string): void => {
  managePath(
    targetPath,
    (absolutePathFromTargetDirectory): boolean =>
      absolutePathFromTargetDirectory.includes(wildCard),
    (absolutePathFromTargetDirectory): void =>
      deleteFileWithCertainWord(absolutePathFromTargetDirectory, wildCard)
  );
};

deleteFileWithCertainExtension = (
  targetPath: string,
  wildCard: string
): void => {
  managePath(
    targetPath,
    (absolutePathFromTargetDirectory): boolean =>
      absolutePathFromTargetDirectory.endsWith(wildCard),
    (absolutePathFromTargetDirectory): void =>
      deleteFileWithCertainExtension(absolutePathFromTargetDirectory, wildCard)
  );
};

deleteFileWithCertainExtensionAndWord = (
  targetPath: string,
  wildCard: string
): void => {
  managePath(
    targetPath,
    (absolutePathFromTargetDirectory): boolean =>
      absolutePathFromTargetDirectory.endsWith(wildCard.split(".")[1]) &&
      absolutePathFromTargetDirectory.includes(wildCard.split(".")[0]),
    (absolutePathFromTargetDirectory): void =>
      deleteFileWithCertainExtension(absolutePathFromTargetDirectory, wildCard)
  );
};

deleteFileWithMultipleWords = (
  targetPath: string,
  wildcard: string
): void => {};

deleteFileWithCertainExtensionAndMultipleWords = (
  targetPath: string,
  wildcard: string
): void => {};

const sanitizeWildCard = (
  wildCard: string,
  type: string,
  extension?: string
): string => {
  if (type === "deleteFileWithCertainWord") {
    return wildCard.slice(1, -1).slice(1, -1);
  } else if (type === "deleteFileWithCertainExtensionAndWord") {
    return `${wildCard
      .substring(1)
      .substring(1)
      .split(".")[0]
      .slice(0, -1)
      .slice(0, -1)}.${extension}`;
  } else if (type === "deleteFileWithMultipleWords") {
    // TODO return deleteFileWithMultipleWords
  } else {
    // TODO return deleteFileWithCertainExtensionAndMultipleWords
  }
};

const filterIncludedFilePaths = (
  startingPath: string,
  wildcard: string
): void => {
  if (wildcard.includes("*")) {
    const wildCardError: string = "Invalid wildcard. See documentation.";
    const asterixCount: number = (wildcard.match(/\*/g) || []).length;
    const extension = wildcard.split(".")[1];

    if (asterixCount % 2 !== 0) {
      throwError(wildCardError);
    } else if (asterixCount === 4 && !wildcard.includes(".")) {
      deleteFileWithCertainWord(
        startingPath,
        sanitizeWildCard(wildcard, "deleteFileWithCertainWord")
      );
    } else if (asterixCount === 4 && wildcard.includes(".")) {
      deleteFileWithCertainExtensionAndWord(
        startingPath,
        sanitizeWildCard(
          wildcard,
          "deleteFileWithCertainExtensionAndWord",
          extension
        )
      );
    } else if (asterixCount > 4 && !wildcard.includes(".")) {
      deleteFileWithMultipleWords(
        startingPath,
        sanitizeWildCard(wildcard, "deleteFileWithMultipleWords")
      );
    } else if (asterixCount > 4 && wildcard.includes(".")) {
      deleteFileWithCertainExtensionAndMultipleWords(
        startingPath,
        sanitizeWildCard(
          wildcard,
          "deleteFileWithCertainExtensionAndMultipleWords"
        )
      );
    } else {
      throwError(wildCardError);
    }
  } else if (wildcard.charAt(0) === ".") {
    deleteFileWithCertainExtension(startingPath, wildcard);
  }
};

/**
 * @param startingPath absolute path of where files should start being deleted. Path must be relative to current project directory
 * @param stoppingPath absolute path of where files should stop being deleted. Path must be relative to current project directory
 * @param fileTypes options that specify which file types should be excluded and deleted from the process.
 * @return executes a callback once the file-deleting process is complete
 */

const fileDeleter = (
  startingPath: string,
  stoppingPath: string,
  fileTypes: FileTypes,
  cb: () => void
): void => {
  handleFileRemovalArgErrors({
    startingPath: startingPath,
    stoppingPath: stoppingPath,
    fileTypes: fileTypes,
  });

  const paths: string[] = [];

  fileTypes.includedFileNames.forEach((wildcard: string): void => {
    if (paths.find((path: string): boolean => path === wildcard)) {
      throwError("Cannot have two of the same wildcards.");
    } else {
      paths.push(wildcard);
      filterIncludedFilePaths(startingPath, wildcard.slice(1, -1));
    }
  });

  cb();
};

/**
 * [.js] => files ending in .js
 * [**example**.js] => files that include the word example and end in .js
 * [**example**] => files that include the word example
 * [**example**other**] => files that include the words example and other
 * [**example**other.js] => files that include the words example and other and end in .js
 */

fileDeleter(
  "./test",
  "./",
  {
    includedFileNames: ["[**mike**]", "[.js]", "[**word**.js]"],
  },
  (): void => {}
);

module.exports = fileDeleter;
